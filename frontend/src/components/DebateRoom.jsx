import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { useAudioAnalysis } from '../hooks/useAudioAnalysis'
import { useWebRTC } from '../hooks/useWebRTC'
import { useGestureAnalysis } from '../hooks/useGestureAnalysis'
import FallacyAlert from './FallacyAlert'
import VideoGrid from './VideoGrid'
import TranscriptPanel from './TranscriptPanel'
import ControlsBar from './ControlsBar'

import { API_BASE } from '../config'
const TURN_TIME = 180 // giây cho mỗi lượt

const playTing = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
    audio.play().catch(e => console.log('Audio autoplay blocked', e))
  } catch { /* bỏ qua lỗi audio */ }
}
// ── TTS ───────────────────────────────────────────────────────────────────
// Ưu tiên TTS phía SERVER (/tts, giọng gTTS cố định) → GIỐNG NHAU trên mọi máy,
// không phụ thuộc giọng trình duyệt/HĐH. Nếu server lỗi mới fallback Web Speech.
let _ttsAudio = null   // audio đang phát (server TTS) — để có thể dừng khi thoát

function stopSpeaking() {
  try { window.speechSynthesis.cancel() } catch { /* ignore */ }
  if (_ttsAudio) {
    try { _ttsAudio.pause(); _ttsAudio.src = '' } catch { /* ignore */ }
    _ttsAudio = null
  }
}

// Chọn giọng vi ổn định nhất cho Web Speech (chỉ dùng khi fallback)
function pickVietnameseVoice() {
  const voices = window.speechSynthesis.getVoices() || []
  const vi = voices.filter(v => (v.lang || '').toLowerCase().startsWith('vi'))
  if (vi.length === 0) return null
  return (
    vi.find(v => /google/i.test(v.name)) ||
    vi.find(v => (v.lang || '').toLowerCase() === 'vi-vn') ||
    vi[0]
  )
}

function speakWebSpeech(text, onEnd) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  let started = false
  const speak = () => {
    if (started) return
    started = true
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'vi-VN'
    utter.rate = 1.0
    utter.pitch = 1.0
    const viVoice = pickVietnameseVoice()
    if (viVoice) utter.voice = viVoice
    utter.onend = () => onEnd?.()
    utter.onerror = () => onEnd?.()
    window.speechSynthesis.speak(utter)
  }
  if ((window.speechSynthesis.getVoices() || []).length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', speak, { once: true })
    setTimeout(speak, 250)
  } else {
    speak()
  }
}

async function speakText(text, onEnd) {
  stopSpeaking()
  try {
    const res = await fetch(`${API_BASE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: 'vi' })
    })
    if (res.ok) {
      const blob = await res.blob()
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        _ttsAudio = audio
        const cleanup = () => { URL.revokeObjectURL(url); if (_ttsAudio === audio) _ttsAudio = null }
        audio.onended = () => { cleanup(); onEnd?.() }
        audio.onerror = () => { cleanup(); speakWebSpeech(text, onEnd) }
        try {
          await audio.play()
          return   // Đang phát bằng server TTS
        } catch {
          cleanup()   // Trình duyệt chặn autoplay → fallback
        }
      }
    }
  } catch (e) {
    console.warn('TTS server không dùng được, chuyển sang Web Speech:', e)
  }
  speakWebSpeech(text, onEnd)
}

export default function DebateRoom({ roomData, roomInfo, mode, username, remotePlayerName, onFinish, registerHandler, sendMessage, onCancel }) {
  // ── State ────────────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TURN_TIME)
  const [currentPlayer, setCurrentPlayer] = useState('A')   // 'A' = user, 'B' = AI/opponent
  const [transcriptA, setTranscriptA] = useState('')
  const [transcriptB, setTranscriptB] = useState('')
  const [aiSpeech, setAiSpeech] = useState('')              // text AI đang nói
  const [fallacy, setFallacy] = useState(null)
  const [fallacySpeaker, setFallacySpeaker] = useState('')
  const [fallaciesA, setFallaciesA] = useState([])
  const [fallaciesB, setFallaciesB] = useState([])
  const [totalRounds, setTotalRounds] = useState(0)
  const [notification, setNotification] = useState(null)   // { text, type }
  const [hint, setHint] = useState(null)
  const [loadingHint, setLoadingHint] = useState(false)
  const [mediaGranted, setMediaGranted] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState([])
  const [bestFriends, setBestFriends] = useState([])
  const [selectedHelper, setSelectedHelper] = useState('')
  const [requestingHelp, setRequestingHelp] = useState(false)

  const spawnEmoji = useCallback((emoji, side = 'right') => {
    const id = Date.now() + Math.random()
    setFloatingEmojis(prev => [...prev, { id, emoji, side }])
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id))
    }, 2500)
  }, [])

  const handleSendEmoji = (emoji) => {
    spawnEmoji(emoji, 'right')
    sendMessage({
      type: 'emoji_react',
      target: roomInfo?.opponentId,
      emoji: emoji
    })
  }

  // Refs để tránh stale closure
  const transcriptARef = useRef('')
  const transcriptBRef = useRef('')
  const currentPlayerRef = useRef('A')
  const timerRef = useRef(null)
  const isRunningRef = useRef(false)
  const opponentGestureRef = useRef(null)   // cử chỉ đối thủ (nhận qua WebSocket)

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { liveText, start: startSpeech, stop: stopSpeech } = useSpeechToText({
    onTranscript: useCallback((text, playerSession) => handleTranscript(text, playerSession), []),
  })

  const { start: startAudio, stop: stopAudio } = useAudioAnalysis()

  const {
    localVideoRef, remoteVideoRef,
    isCameraOn, isMicOn, initWebRTC, toggleCamera, toggleMic, stopAllMedia,
    localStream, remoteStream
  } = useWebRTC({
    roomId: roomInfo?.roomId,
    isHost: roomInfo?.isHost,
    opponentId: roomInfo?.opponentId,
    sendMessage,
    registerHandler
  })

  // ── Phân tích cử chỉ (MediaPipe) trên camera người chơi ──────────────────
  const {
    ready: gestureReady,
    metrics: gestureMetrics,
    getReport: getGestureReport,
  } = useGestureAnalysis({ videoRef: localVideoRef, active: isRunning && isCameraOn })

  // Sync refs
  useEffect(() => { transcriptARef.current = transcriptA }, [transcriptA])
  useEffect(() => { transcriptBRef.current = transcriptB }, [transcriptB])
  useEffect(() => { currentPlayerRef.current = currentPlayer }, [currentPlayer])
  useEffect(() => { isRunningRef.current = isRunning }, [isRunning])

  // ── Khởi tạo TTS Voices ──────────────────────────────────────────────
  useEffect(() => {
    // Pre-load TTS voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.addEventListener('voiceschanged', () => {})
    }
  }, []) // eslint-disable-line

  const handleGrantMedia = async () => {
    try {
      await initWebRTC()
      setMediaGranted(true)
    } catch {
      alert("Lỗi cấp quyền hoặc không tìm thấy thiết bị!")
    }
  }

  useEffect(() => {
    if (!username || username.startsWith('Guest_') || !mode?.includes('1v1')) return
    axios.get(`${API_BASE}/friends/${encodeURIComponent(username)}`)
      .then(res => {
        if (res.data.success) {
          const helpers = (res.data.friends || []).filter(f => (f.debate_count || 0) >= 50)
          setBestFriends(helpers)
          if (helpers[0]) setSelectedHelper(helpers[0].username)
        }
      })
      .catch(() => {})
  }, [username, mode])

  const handleRequestBestFriendHelp = async () => {
    if (!selectedHelper) return
    setRequestingHelp(true)
    try {
      const res = await axios.post(`${API_BASE}/request-help`, {
        from_user: username,
        to_user: selectedHelper,
        topic: roomData.topic,
        mode
      })
      showNotification(res.data.success ? '🆘 Đã gửi lời nhờ trợ giúp tới bạn thân.' : (res.data.error || 'Không gửi được lời nhờ trợ giúp'), res.data.success ? 'success' : 'warning')
    } catch {
      showNotification('Không gửi được lời nhờ trợ giúp.', 'error')
    } finally {
      setRequestingHelp(false)
    }
  }

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // Hết giờ → tự động chuyển lượt
          handleTimeUp()
          return TURN_TIME
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [isRunning, currentPlayer])

  // ── Thông báo tạm thời ──────────────────────────────────────────────────
  const showNotification = (text, type = 'info') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // ── Phân tích ngụy biện ─────────────────────────────────────────────────
  const handleTranscript = useCallback(async (text, playerSession) => {
    const player = playerSession || currentPlayerRef.current
    
    // Cập nhật local state
    if (player === 'A') {
      setTranscriptA(prev => {
        const newVal = prev + ' ' + text
        transcriptARef.current = newVal
        return newVal
      })
    } else {
      setTranscriptB(prev => {
        const newVal = prev + ' ' + text
        transcriptBRef.current = newVal
        return newVal
      })
    }

    // GỬI SANG ĐỐI THỦ: Đồng bộ transcript thời gian thực
    sendMessage({
      type: 'transcript_update',
      target: roomInfo?.opponentId,
      text: text,
      player: player // 'A' hoặc 'B'
    })

    try {
      const res = await axios.post(`${API_BASE}/analyze`, {
        text,
        speaker: player === 'A' ? roomData.playerA : roomData.playerB
      })
      if (res.data.is_fallacy) {
        setFallacy(res.data.fallacy)
        setFallacySpeaker(res.data.speaker)
        const fall_en = res.data.fallacy_en
        if (player === 'A') setFallaciesA(prev => [...prev, fall_en])
        else setFallaciesB(prev => [...prev, fall_en])

        // Gửi thông báo ngụy biện sang đối thủ
        sendMessage({
          type: 'fallacy_detected',
          target: roomInfo?.opponentId,
          fallacy: res.data.fallacy,
          fallacy_en: fall_en,
          speaker: res.data.speaker,
          player: player
        })
      }
    } catch (err) {
      console.error('Lỗi phân tích ngụy biện:', err)
    }
  }, [roomData, roomInfo, sendMessage])

  // ── Đăng ký các Handler nhận dữ liệu từ đối thủ ──────────────────────────
  useEffect(() => {
    if (mode === 'solo_ai') return

    // Nhận transcript từ đối thủ
    registerHandler('transcript_update', (data) => {
      if (data.player === 'A') setTranscriptA(prev => prev + ' ' + data.text)
      else setTranscriptB(prev => prev + ' ' + data.text)
    })

    // Nhận thông báo ngụy biện từ đối thủ
    registerHandler('fallacy_detected', (data) => {
      setFallacy(data.fallacy)
      setFallacySpeaker(data.speaker)
      if (data.player === 'A') setFallaciesA(prev => [...prev, data.fallacy_en])
      else setFallaciesB(prev => [...prev, data.fallacy_en])
    })

    // Nhận tín hiệu điều khiển
    registerHandler('control_action', (data) => {
      if (data.action === 'start') {
        setIsRunning(true)
        if (data.fromPlayer !== (roomData.isLocalHost ? 'A' : 'B')) {
           // Nếu lượt hiện tại là của mình, thì bật Mic
           if (currentPlayerRef.current === (roomData.isLocalHost ? 'A' : 'B')) {
              startSpeech(currentPlayerRef.current)
              startAudio()
           }
        }
      } else if (data.action === 'pause') {
        setIsRunning(false)
        stopSpeech()
        stopAudio()
      } else if (data.action === 'next_turn') {
        stopSpeech()
        stopAudio()
        setIsRunning(false)
        setCurrentPlayer(data.nextPlayer)
        setTotalRounds(p => p + 1)
        setTimeLeft(TURN_TIME)
        playTing()
      }
    })

    // Nhận tín hiệu kết thúc trận đấu
    registerHandler('debate_ended', () => {
      showNotification('🏁 Đối thủ đã kết thúc trận đấu. Đang chấm điểm...', 'warning')
      performFinalScoring()
    })

    // Nhận emoji
    registerHandler('emoji_react', (data) => {
      spawnEmoji(data.emoji, 'left')
    })

    // Nhận điểm cử chỉ (MediaPipe) từ đối thủ
    registerHandler('gesture_update', (data) => {
      opponentGestureRef.current = data.report || null
    })
  }, [mode, registerHandler, roomData.isLocalHost, startSpeech, startAudio, stopSpeech, stopAudio, spawnEmoji])

  // Broadcast cử chỉ của mình sang đối thủ mỗi 3s (chỉ 1v1)
  useEffect(() => {
    if (mode === 'solo_ai' || !isRunning) return
    const id = setInterval(() => {
      const r = getGestureReport()
      if (r) sendMessage({ type: 'gesture_update', target: roomInfo?.opponentId, report: r })
    }, 3000)
    return () => clearInterval(id)
  }, [mode, isRunning, getGestureReport, sendMessage, roomInfo])

  // ── Hết giờ lượt hiện tại ──────────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    stopSpeech()
    stopAudio()
    setIsRunning(false)
    const next = currentPlayerRef.current === 'A' ? 'B' : 'A'
    
    // Tự động đồng bộ chuyển lượt khi hết giờ
    if (mode !== 'solo_ai') {
      sendMessage({
        type: 'control_action',
        target: roomInfo?.opponentId,
        action: 'next_turn',
        nextPlayer: next
      })
    }

    setCurrentPlayer(next)
    setTotalRounds(p => p + 1)
    setTimeLeft(TURN_TIME)
    playTing()

    const nextName = next === 'A' ? roomData.playerA : (remotePlayerName || roomData.playerB)
    showNotification(`⏰ Hết giờ! Đến lượt ${nextName}`, 'warning')

    if (next === 'B' && mode === 'solo_ai') {
      triggerAiTurn()
    }
  }, [roomData, remotePlayerName, mode, roomInfo, sendMessage, stopSpeech, stopAudio])

  // ── AI Gemini tự tranh biện ─────────────────────────────────────────────
  const triggerAiTurn = useCallback(async () => {
    setIsAiThinking(true)
    showNotification('🤖 AI Gemini đang suy nghĩ...', 'info')

    try {
      const res = await axios.post(`${API_BASE}/generate-response`, {
        topic: roomData.topic,
        transcript_a: transcriptARef.current.trim() || 'Chưa có lập luận',
        transcript_b: transcriptBRef.current.trim() || ''
      })

      const aiText = res.data.response || 'Tôi cần thêm thời gian để suy nghĩ về vấn đề này.'
      setAiSpeech(aiText)
      setTranscriptB(prev => {
        const newVal = prev + ' ' + aiText
        transcriptBRef.current = newVal
        return newVal
      })

      showNotification('🔊 AI Gemini đang phát biểu...', 'success')
      setIsAiThinking(false)

      // Nói bằng TTS
      speakText(aiText, () => {
        showNotification('✅ AI đã phát biểu xong. Đến lượt bạn!', 'success')
        setCurrentPlayer('A')
        setTimeLeft(TURN_TIME)
      })

    } catch (err) {
      console.error('Lỗi AI turn:', err)
      setIsAiThinking(false)
      showNotification('❌ AI gặp lỗi. Bạn có thể tiếp tục.', 'error')
      setCurrentPlayer('A')
      setTimeLeft(TURN_TIME)
    }
  }, [roomData.topic])

  // ── Controls ─────────────────────────────────────────────────────────────
  const handleStart = () => {
    setIsRunning(true)
    const myRole = roomData.isLocalHost ? 'A' : 'B'
    
    if (currentPlayer === myRole) {
      startSpeech(currentPlayer)
      startAudio()
    }

    if (mode !== 'solo_ai') {
      sendMessage({
        type: 'control_action',
        target: roomInfo?.opponentId,
        action: 'start',
        fromPlayer: myRole
      })
    }
    
    showNotification(`▶️ Bắt đầu! Lượt của ${currentPlayer === 'A' ? roomData.playerA : (remotePlayerName || roomData.playerB)}`, 'success')
  }

  const handlePause = () => {
    stopSpeech()
    stopAudio()
    setIsRunning(false)

    if (mode !== 'solo_ai') {
      sendMessage({
        type: 'control_action',
        target: roomInfo?.opponentId,
        action: 'pause'
      })
    }
    showNotification('⏸️ Đã tạm dừng', 'info')
  }

  const handleNextTurn = () => {
    stopSpeech()
    stopAudio()
    setIsRunning(false)
    stopSpeaking()

    const next = currentPlayer === 'A' ? 'B' : 'A'
    
    if (mode !== 'solo_ai') {
      sendMessage({
        type: 'control_action',
        target: roomInfo?.opponentId,
        action: 'next_turn',
        nextPlayer: next
      })
    }

    setCurrentPlayer(next)
    setTotalRounds(p => p + 1)
    setTimeLeft(TURN_TIME)
    setHint(null)
    playTing()

    const nextName = next === 'A' ? roomData.playerA : (remotePlayerName || roomData.playerB)
    showNotification(`⏭️ Đến lượt ${nextName}`, 'info')

    if (next === 'B' && mode === 'solo_ai') {
      triggerAiTurn()
    } else if (next === 'A') {
      fetchHint()
    }
  }

  const fetchHint = async () => {
    if (!transcriptBRef.current.trim()) return
    setLoadingHint(true)
    try {
      const res = await axios.post(`${API_BASE}/hint`, {
        topic: roomData.topic,
        transcript_a: transcriptARef.current.trim(),
        transcript_b: transcriptBRef.current.trim()
      })
      if (res.data.success) {
        setHint(res.data.hint)
      }
    } catch (e) {
      console.error("Lỗi lấy gợi ý:", e)
    } finally {
      setLoadingHint(false)
    }
  }

  const handleDebateEnd = () => {
    // Gửi tín hiệu kết thúc sang đối thủ trước
    if (mode !== 'solo_ai') {
      sendMessage({
        type: 'debate_ended',
        target: roomInfo?.opponentId
      })
    }
    performFinalScoring()
  }

  const performFinalScoring = async () => {
    stopSpeech()
    stopAudio()
    stopAllMedia() // Tắt Camera & Mic ngay lập tức
    setIsRunning(false)
    stopSpeaking()
    setIsScoring(true)

    const finalTranscriptA = transcriptARef.current.trim() || 'Người chơi chưa phát biểu.'
    const finalTranscriptB = transcriptBRef.current.trim() || 'Đối thủ chưa phát biểu.'

    // Điểm cử chỉ THẬT (MediaPipe). A = host, B = guest (nhãn chung 2 client).
    // -> cử chỉ của mình vào slot theo vai trò, cử chỉ đối thủ vào slot còn lại.
    const toVS = (g) => (g
      ? { eyeContact: g.eyeContact, presence: g.presence, expressiveness: g.expressiveness, gesture: g.score }
      : {})
    const myGesture = getGestureReport()
    const oppGesture = opponentGestureRef.current
    const iAmA = roomData.isLocalHost
    const videoScoresA = iAmA ? toVS(myGesture) : toVS(oppGesture)
    const videoScoresB = iAmA ? toVS(oppGesture) : toVS(myGesture)

    try {
      const res = await axios.post(`${API_BASE}/score`, {
        topic: roomData.topic,
        player_a: roomData.playerA,
        player_b: remotePlayerName || roomData.playerB,
        transcript_a: finalTranscriptA,
        transcript_b: finalTranscriptB,
        fallacies_a: fallaciesA,
        fallacies_b: fallaciesB,
        video_scores_a: videoScoresA,
        audio_scores_a: {},
        video_scores_b: videoScoresB,
        audio_scores_b: {},
        mode: mode
      })

      if (res.data.success) {
        onFinish({
          scores: res.data.scores,
          playerA: roomData.playerA,
          playerB: remotePlayerName || roomData.playerB,
          topic: roomData.topic,
          rawUsernameA: roomData.rawUsernameA,
          rawUsernameB: roomData.rawUsernameB,
          transcript_a: finalTranscriptA,
          transcript_b: finalTranscriptB,
          fallacies_a: fallaciesA,
          fallacies_b: fallaciesB,
          gesture_a: videoScoresA.gesture ?? null,
          gesture_b: videoScoresB.gesture ?? null,
          mode: mode
        })
      } else {
        alert('Lỗi chấm điểm: ' + (res.data.error || 'Không xác định'))
        setIsScoring(false)
      }
    } catch (err) {
      console.error('Lỗi chấm điểm:', err)
      alert('Không thể kết nối đến server để chấm điểm. Vui lòng kiểm tra backend.')
      setIsScoring(false)
    }
  }

  // ── Thoát phòng: dừng MỌI thứ (kể cả AI đang nói) rồi mới rời ──────────────
  const handleLeave = useCallback(() => {
    stopSpeaking()
    stopSpeech()
    stopAudio()
    stopAllMedia()
    setIsRunning(false)
    // Báo cho đối thủ biết mình đã rời phòng (chỉ 1v1)
    if (mode !== 'solo_ai' && roomInfo?.opponentId) {
      sendMessage({ type: 'player_declined', target: roomInfo.opponentId, reason: 'left' })
    }
    onCancel && onCancel()
  }, [mode, roomInfo, sendMessage, stopSpeech, stopAudio, stopAllMedia, onCancel])

  // Dọn dẹp khi unmount: đảm bảo AI không còn nói sau khi rời phòng
  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  const playerBName = remotePlayerName || roomData.playerB

  // ── Render ───────────────────────────────────────────────────────────────
  if (!mediaGranted) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', padding: '20px'
      }}>
        <div style={{
          background: 'var(--bg-glass)', padding: '3rem', borderRadius: '24px',
          border: '1px solid var(--border-light)', textAlign: 'center', maxWidth: '500px'
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🎥🎤</div>
          <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Cấp Quyền Thiết Bị</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.5' }}>
            KaiKo cần quyền truy cập Camera và Microphone của bạn để có thể bắt đầu trận đấu. Vui lòng nhấn nút bên dưới để cấp quyền.
          </p>
          <button 
            onClick={handleGrantMedia}
            className="btn-primary" 
            style={{ padding: '16px 32px', fontSize: '1.2rem', width: '100%', fontWeight: 'bold' }}
          >
            Cho Phép Truy Cập
          </button>
          <button 
            onClick={() => onCancel && onCancel()}
            style={{ 
              marginTop: '15px', padding: '12px 32px', fontSize: '1rem', width: '100%', 
              background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', 
              borderRadius: 'var(--radius-full)', cursor: 'pointer' 
            }}
          >
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      minHeight: '100vh',
      boxSizing: 'border-box',
      position: 'relative'
    }}>

      {/* ── Notification Toast ── */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          padding: '14px 28px',
          borderRadius: '0px',
          background: notification.type === 'success' ? '#10b981'
            : notification.type === 'warning' ? '#f59e0b'
            : notification.type === 'error' ? '#ef4444'
            : '#6366f1',
          color: 'white',
          fontWeight: '600',
          fontSize: '1rem',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {notification.text}
        </div>
      )}

      {/* ── Header ── */}
      <div className="glass-panel" style={{
        padding: '1.5rem 2rem',
        borderLeft: '4px solid var(--accent-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.8rem' }}>🎤 {roomData.topic}</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{roomData.playerA} {roomData.isLocalHost ? '(Bạn - Ủng hộ)' : '(Ủng hộ)'}</span>
            {' '}vs{' '}
            <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{playerBName} {!roomData.isLocalHost ? '(Bạn - Phản đối)' : '(Phản đối)'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isAiThinking && (
            <div style={{
              padding: '8px 16px',
              background: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid rgba(168,85,247,0.5)',
              borderRadius: 'var(--radius-full)',
              color: '#a855f7',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              🤖 AI đang suy nghĩ...
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: 'var(--radius-full)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Lượt: </span>
            <strong style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>{totalRounds + 1}</strong>
          </div>
        </div>
      </div>

      {/* ── Video Grid ── */}
      <div style={{ position: 'relative' }}>
        <VideoGrid
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          localStream={localStream}
          remoteStream={remoteStream}
          remoteName={playerBName}
          localName={roomData.playerA}
          isCameraOn={isCameraOn}
          onToggleCamera={toggleCamera}
          isMicOn={isMicOn}
          onToggleMic={toggleMic}
          isAiSpeaking={isAiThinking || (mode === 'solo_ai' && currentPlayer === 'B')}
          isUserSpeaking={isRunning && currentPlayer === 'A'}
        />

        {/* --- Hint Bot (Trợ lý nhỏ) --- */}
        {currentPlayer === 'A' && (loadingHint || hint) && (
          <div style={{
            position: 'absolute',
            bottom: '24px',
            right: '220px', // Đặt cạnh local video
            width: '280px',
            background: 'rgba(30,41,59,0.95)',
            border: '1px solid rgba(168,85,247,0.5)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeInUp 0.4s ease',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
              <span style={{ fontSize: '1.2rem', animation: loadingHint ? 'aiPulse 1s infinite' : 'none' }}>💡</span>
              <span style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '0.85rem' }}>Trợ lý KaiKo</span>
            </div>
            {loadingHint ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Đang phân tích để gợi ý...</p>
            ) : (
              <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.4 }}>
                {hint}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* ── Transcript Panel ── */}
        <TranscriptPanel
          currentPlayer={currentPlayer}
          playerAName={roomData.playerA}
          playerBName={playerBName}
          transcriptA={transcriptA}
          transcriptB={transcriptB}
          fallaciesA={fallaciesA}
          fallaciesB={fallaciesB}
          aiSpeech={aiSpeech}
          liveText={liveText}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bestFriends.length > 0 && mode?.includes('1v1') && (
            <div className="glass-panel" style={{ padding: '14px', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div style={{ color: '#6ee7b7', fontWeight: '800', marginBottom: '10px' }}>🆘 Nhờ Bạn thân trợ giúp</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={selectedHelper} onChange={e => setSelectedHelper(e.target.value)} style={{ flex: 1, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '9px' }}>
                  {bestFriends.map(f => <option key={f.username} value={f.username}>{f.username}</option>)}
                </select>
                <button onClick={handleRequestBestFriendHelp} disabled={requestingHelp} className="btn-primary" style={{ padding: '9px 12px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                  {requestingHelp ? 'Đang gửi...' : 'Gửi SOS'}
                </button>
              </div>
            </div>
          )}
          {/* ── HUD Cử chỉ (MediaPipe) ── */}
          {mode !== 'solo_ai' || isCameraOn ? (
            <div className="glass-panel" style={{ padding: '14px', border: '1px solid rgba(56,189,248,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#7dd3fc', fontWeight: 800 }}>🎥 Cử chỉ (camera)</span>
                <span style={{
                  fontSize: '1.4rem', fontWeight: 800,
                  color: gestureMetrics.score >= 60 ? '#4ade80' : gestureMetrics.score >= 35 ? '#fbbf24' : '#f87171'
                }}>
                  {gestureReady ? `${gestureMetrics.score}/100` : '…'}
                </span>
              </div>
              {gestureReady ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: '👁️ Giao tiếp mắt', val: gestureMetrics.eyeContact },
                    { label: '🙂 Biểu cảm', val: gestureMetrics.expressiveness },
                    { label: '🎯 Hiện diện', val: gestureMetrics.presence },
                  ].map((m) => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '110px' }}>{m.label}</span>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${m.val}%`, height: '100%', background: 'linear-gradient(90deg,#38bdf8,#818cf8)', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '34px', textAlign: 'right' }}>{m.val}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Đang tải mô hình nhận diện cử chỉ… (cần bật camera + Internet)
                </p>
              )}
            </div>
          ) : null}

          {/* ── Controls Bar ── */}
          <ControlsBar
            timeLeft={timeLeft}
            isRunning={isRunning}
            currentPlayer={currentPlayer}
            playerAName={roomData.playerA}
            playerBName={playerBName}
            isScoring={isScoring}
            isAiThinking={isAiThinking}
            onStart={handleStart}
            onStop={handlePause}
            onNextTurn={handleNextTurn}
            onEnd={handleDebateEnd}
            onCancel={handleLeave}
          />
        </div>
      </div>

      {/* ── Fallacy Alert ── */}
      <FallacyAlert fallacy={fallacy} speaker={fallacySpeaker} />

      {/* ── Reaction Toolbar ── */}
      {mode !== 'solo_ai' && (
        <div style={{
          position: 'fixed',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'var(--bg-glass)',
          padding: '10px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-light)',
          zIndex: 100,
          backdropFilter: 'blur(10px)'
        }}>
          {['👍', '👎', '😂', '🔥', '🦀', '😡', '👏'].map(emo => (
            <button 
              key={emo} 
              onClick={() => handleSendEmoji(emo)} 
              style={{ background: 'transparent', border: 'none', fontSize: '2rem', cursor: 'pointer', transition: 'transform 0.2s' }} 
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'} 
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {emo}
            </button>
          ))}
        </div>
      )}

      {/* ── Floating Emojis ── */}
      {floatingEmojis.map(e => (
        <div key={e.id} style={{
          position: 'fixed',
          bottom: '100px',
          [e.side]: '100px',
          fontSize: '4rem',
          animation: 'floatUp 2.5s ease-out forwards',
          zIndex: 9999,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
        }}>
          {e.emoji}
        </div>
      ))}
    </div>
  )
}
