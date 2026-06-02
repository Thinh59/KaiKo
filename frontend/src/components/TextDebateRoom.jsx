import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import FallacyAlert from './FallacyAlert'
import Avatar from './Avatar'
import { useUser } from '@clerk/clerk-react'

const API_BASE = 'http://localhost:8000'

export default function TextDebateRoom({ roomData, roomInfo, mode, username, onFinish, onCancel, registerHandler, sendMessage }) {
  const { user } = useUser()
  const [messages, setMessages] = useState([]) // { id, speaker, text, fallacy, isAiGenerated, isExcellent }
  const [input, setInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const inputRef = useRef(null)
  
  const [fallacy, setFallacy] = useState(null)
  const [fallacySpeaker, setFallacySpeaker] = useState('')
  const [fallaciesA, setFallaciesA] = useState([])
  const [fallaciesB, setFallaciesB] = useState([])
  const [bestFriends, setBestFriends] = useState([])
  const [selectedHelper, setSelectedHelper] = useState('')
  const [requestingHelp, setRequestingHelp] = useState(false)
  
  const [hint, setHint] = useState('')
  const [gettingHint, setGettingHint] = useState(false)
  
  const [effectA, setEffectA] = useState(null)
  const [effectB, setEffectB] = useState(null)
  
  const [systemAlert, setSystemAlert] = useState(null)

  // --- NEW STATES FOR RACE & TIMER ---
  const [phase, setPhase] = useState('topic_race') // 'topic_race', 'debate', 'scoring'
  const [topicInput, setTopicInput] = useState('')
  const [currentTopic, setCurrentTopic] = useState(roomData.topic || 'Chủ đề ngẫu nhiên')
  const [topicTimeLeft, setTopicTimeLeft] = useState(15)
  const [debateTimeLeft, setDebateTimeLeft] = useState(1800) // 30 minutes
  const [endRequested, setEndRequested] = useState(false) // Did *I* request to end?
  const [opponentWantsToEnd, setOpponentWantsToEnd] = useState(false)

  const chatEndRef = useRef(null)
  
  // Identify who is who
  const isSolo = mode === 'text_solo'
  const isPlayerA = roomData.isLocalHost

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiThinking, systemAlert, phase])

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

  // --- TIMER LOGIC ---
  useEffect(() => {
    let timer;
    if (phase === 'topic_race') {
      timer = setInterval(() => {
        setTopicTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            // Time ran out for topic race, fallback to roomData.topic and start debate
            setPhase('debate')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (phase === 'debate') {
      timer = setInterval(() => {
        setDebateTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [phase])

  // --- WEBSOCKET HANDLERS ---
  useEffect(() => {
    if (isSolo || !registerHandler) {
      if (isSolo && phase === 'topic_race') {
        // AI doesn't race, let the user race or time out
      }
      return
    }

    const cleanupChat = registerHandler('chat_msg', (data) => {
      setMessages(prev => [...prev, data.msg])
      
      const skillTypes = ['fire', 'lightning', 'bubble', 'rock', '💧', '🌪️', '☄️'];
      const randomSkill = skillTypes[Math.floor(Math.random() * skillTypes.length)];
      if (data.msg.speaker === 'B') {
        setEffectA(randomSkill);
        setTimeout(() => setEffectA(null), 1500);
      } else {
        setEffectB(randomSkill);
        setTimeout(() => setEffectB(null), 1500);
      }

      if (data.msg.fallacy && data.msg.speaker !== (isPlayerA ? 'A' : 'B')) {
        setFallacy(data.msg.fallacy)
        setFallacySpeaker(data.msg.speaker === 'A' ? roomData.playerA : roomData.playerB)
        if (data.msg.speaker === 'A') setFallaciesA(prev => [...prev, data.msg.fallacy])
        else setFallaciesB(prev => [...prev, data.msg.fallacy])
      }
    })

    const cleanupTopic = registerHandler('topic_submitted', (data) => {
      if (phase === 'topic_race') {
        setCurrentTopic(data.topic)
        setPhase('debate')
        setSystemAlert({ type: 'success', msg: `${data.speakerName} đã chốt chủ đề: ${data.topic}` })
        setTimeout(() => setSystemAlert(null), 4000)
      }
    })

    const cleanupSkill = registerHandler('skill_attack', (data) => {
      const { targetPlayer, skillType } = data;
      if (targetPlayer === 'A') {
        setEffectA(skillType);
        setTimeout(() => setEffectA(null), 1500);
      } else {
        setEffectB(skillType);
        setTimeout(() => setEffectB(null), 1500);
      }
    })

    const cleanupEndReq = registerHandler('end_request', () => {
      setOpponentWantsToEnd(true)
    })

    const cleanupEndConfirm = registerHandler('end_confirm', () => {
      setPhase('scoring')
      setSystemAlert({ type: 'success', msg: 'Đối thủ đã đồng ý kết thúc. Đang chấm điểm...' })
      if (isPlayerA) executeScoring()
    })

    const cleanupResult = registerHandler('debate_result', (data) => {
      // Received from host
      if (!isPlayerA) {
        onFinish(data.result)
      }
    })

    return () => {
      cleanupChat && cleanupChat()
      cleanupTopic && cleanupTopic()
      cleanupSkill && cleanupSkill()
      cleanupEndReq && cleanupEndReq()
      cleanupEndConfirm && cleanupEndConfirm()
      cleanupResult && cleanupResult()
    }
  }, [isSolo, registerHandler, isPlayerA, roomData, phase, onFinish])

  // If host enters scoring phase (and no opponent confirm needed, e.g. time is up or solo), execute scoring
  useEffect(() => {
    if (phase === 'scoring' && isPlayerA && !opponentWantsToEnd && !endRequested) {
      // Actually we just call executeScoring directly when setting phase to scoring as host
    }
  }, [phase, isPlayerA])


  const handleRequestBestFriendHelp = async () => {
    if (!selectedHelper) return
    setRequestingHelp(true)
    try {
      const res = await axios.post(`${API_BASE}/request-help`, {
        from_user: username,
        to_user: selectedHelper,
        topic: currentTopic,
        mode
      })
      setSystemAlert({ type: res.data.success ? 'success' : 'warning', msg: res.data.success ? '🆘 Đã gửi lời nhờ trợ giúp tới bạn thân.' : (res.data.error || 'Không gửi được lời nhờ trợ giúp') })
      setTimeout(() => setSystemAlert(null), 4000)
    } catch (err) {
      setSystemAlert({ type: 'warning', msg: 'Không gửi được lời nhờ trợ giúp.' })
      setTimeout(() => setSystemAlert(null), 4000)
    } finally {
      setRequestingHelp(false)
    }
  }

  const handleGetHint = async () => {
    setGettingHint(true)
    setHint('')
    const transcriptA = messages.filter(m => m.speaker === 'A').map(m => m.text).join('. ')
    const transcriptB = messages.filter(m => m.speaker === 'B').map(m => m.text).join('. ')
    const role = isPlayerA ? 'A' : 'B'
    try {
      const res = await axios.post(`${API_BASE}/hint`, {
        topic: currentTopic, transcript_a: transcriptA, transcript_b: transcriptB, role
      })
      if (res.data.success) {
        setHint(res.data.hint)
      } else {
        setSystemAlert({ type: 'warning', msg: 'Không lấy được gợi ý: ' + res.data.error })
        setTimeout(() => setSystemAlert(null), 4000)
      }
    } catch(err) {
      setSystemAlert({ type: 'warning', msg: 'Lỗi khi lấy gợi ý.' })
      setTimeout(() => setSystemAlert(null), 4000)
    } finally {
      setGettingHint(false)
    }
  }

  // Removed explicit castSkill function since it's automated now

  const handleSubmitTopic = (e) => {
    e.preventDefault()
    if (!topicInput.trim()) return
    const newTopic = topicInput.trim()
    setCurrentTopic(newTopic)
    setPhase('debate')
    if (!isSolo && sendMessage && roomInfo) {
      sendMessage({ type: 'topic_submitted', target: roomInfo.opponentId, topic: newTopic, speakerName: isPlayerA ? roomData.playerA : roomData.playerB })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || phase !== 'debate') return
    
    const userText = input.trim()
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = '56px';
    }
    
    const speakerLabel = isPlayerA ? 'A' : 'B'
    const speakerName = isPlayerA ? roomData.playerA : roomData.playerB

    const newMsg = { id: Date.now(), speaker: speakerLabel, text: userText, fallacy: null, isAiGenerated: false, isExcellent: false }
    setMessages(prev => [...prev, newMsg])

    // Auto cast skill
    const skillTypes = ['fire', 'lightning', 'bubble', 'rock', '💧', '🌪️', '☄️'];
    const randomSkill = skillTypes[Math.floor(Math.random() * skillTypes.length)];
    if (speakerLabel === 'A') {
      setEffectB(randomSkill);
      setTimeout(() => setEffectB(null), 1500);
    } else {
      setEffectA(randomSkill);
      setTimeout(() => setEffectA(null), 1500);
    }

    // Phân tích text
    try {
      const res = await axios.post(`${API_BASE}/analyze-text`, {
        text: userText, speaker: speakerName, topic: currentTopic
      })
      
      const { is_profanity, is_off_topic, is_excellent, is_fallacy, fallacy_name_vi, is_ai, ai_reason } = res.data
      
      if (is_profanity) {
        alert("⛔ TÀI KHOẢN CỦA BẠN ĐÃ BỊ CẤM CHAT (Vi phạm ngôn từ thô tục)!")
        onCancel()
        return
      }

      let fallName = null
      let isAiGen = false
      let isExc = false

      if (is_fallacy) {
        fallName = fallacy_name_vi || "Ngụy biện logic"
        setFallacy(fallName)
        setFallacySpeaker(speakerName)
        if (isPlayerA) setFallaciesA(prev => [...prev, fallName])
        else setFallaciesB(prev => [...prev, fallName])
      }
      
      if (is_off_topic) {
        setSystemAlert({ type: 'warning', msg: "⚠️ Chú ý: Lập luận của bạn đang LẠC ĐỀ!" })
        setTimeout(() => setSystemAlert(null), 4000)
      }
      
      if (is_excellent) {
        isExc = true
        setSystemAlert({ type: 'success', msg: "🌟 Tuyệt Cú Mèo! Lập luận quá xuất sắc! (+ Điểm Tích Lũy)" })
        setTimeout(() => setSystemAlert(null), 4000)
      }

      if (is_ai) {
        isAiGen = true
        alert(`Cảnh báo: Đoạn văn có dấu hiệu được viết bằng AI!\nLý do: ${ai_reason}`)
        if (isPlayerA) setFallaciesA(prev => [...prev, "Sử dụng AI gian lận"])
        else setFallaciesB(prev => [...prev, "Sử dụng AI gian lận"])
      }

      const updatedMsg = { ...newMsg, fallacy: fallName, isAiGenerated: isAiGen, isExcellent: isExc }
      
      setMessages(prev => prev.map(m => m.id === newMsg.id ? updatedMsg : m))

      // Nếu có đối thủ mạng, gửi tin nhắn đi
      if (!isSolo && sendMessage && roomInfo) {
        sendMessage({ type: 'chat_msg', target: roomInfo.opponentId, msg: updatedMsg })
      }
      
    } catch(err) {}

    // AI Turn (Nếu chơi Solo)
    if (isSolo) {
      setIsAiThinking(true)
      try {
        const transcriptA = [...messages, newMsg].filter(m => m.speaker === 'A').map(m => m.text).join('. ')
        const transcriptB = messages.filter(m => m.speaker === 'B').map(m => m.text).join('. ')
        
        const aiRes = await axios.post(`${API_BASE}/generate-response`, {
          topic: currentTopic, transcript_a: transcriptA, transcript_b: transcriptB
        })
        
        const aiText = aiRes.data.response || 'Tôi không có phản hồi.'
        setMessages(prev => [...prev, { id: Date.now(), speaker: 'B', text: aiText, fallacy: null, isAiGenerated: false }])
        
        // AI Attack
        const aiSkillTypes = ['fire', 'lightning', 'bubble', 'rock', '💧', '🌪️', '☄️'];
        const aiSkill = aiSkillTypes[Math.floor(Math.random() * aiSkillTypes.length)];
        setEffectA(aiSkill);
        setTimeout(() => setEffectA(null), 1500);
      } catch(err) {
        setMessages(prev => [...prev, { id: Date.now(), speaker: 'B', text: 'AI đang bận, xin lỗi.', fallacy: null, isAiGenerated: false }])
      } finally {
        setIsAiThinking(false)
      }
    }
  }

  const handleEndClick = () => {
    if (isSolo || debateTimeLeft === 0) {
      setPhase('scoring')
      if (isPlayerA) executeScoring()
      else if (isSolo) executeScoring() // Solo can score
    } else {
      setEndRequested(true)
      sendMessage({ type: 'end_request', target: roomInfo.opponentId })
      setSystemAlert({ type: 'warning', msg: 'Đã gửi yêu cầu kết thúc sớm. Chờ đối thủ đồng ý...' })
      setTimeout(() => setSystemAlert(null), 3000)
    }
  }

  const handleAcceptEnd = () => {
    setOpponentWantsToEnd(false)
    setPhase('scoring')
    sendMessage({ type: 'end_confirm', target: roomInfo.opponentId })
    if (isPlayerA) executeScoring()
  }

  const handleRejectEnd = () => {
    setOpponentWantsToEnd(false)
    // Could send a reject message, but ignoring is fine for now
  }

  const executeScoring = async () => {
    const transcriptA = messages.filter(m => m.speaker === 'A').map(m => m.text).join('. ') || 'Người chơi chưa phát biểu.'
    const transcriptB = messages.filter(m => m.speaker === 'B').map(m => m.text).join('. ') || 'Đối thủ chưa phát biểu.'
    
    try {
      const res = await axios.post(`${API_BASE}/score`, {
        topic: currentTopic,
        player_a: roomData.playerA,
        player_b: roomData.playerB,
        transcript_a: transcriptA,
        transcript_b: transcriptB,
        fallacies_a: fallaciesA,
        fallacies_b: fallaciesB,
        video_scores_a: { eyeContact: 80 }, audio_scores_a: { loudPct: 50 },
        video_scores_b: { eyeContact: 80 }, audio_scores_b: { loudPct: 50 },
      })
      if (res.data.success) {
        const finalResult = {
          scores: res.data.scores,
          playerA: roomData.playerA,
          playerB: roomData.playerB,
          topic: currentTopic,
          rawUsernameA: roomData.rawUsernameA,
          rawUsernameB: roomData.rawUsernameB,
          transcript_a: transcriptA,
          transcript_b: transcriptB
        }
        if (!isSolo && sendMessage && roomInfo) {
          sendMessage({ type: 'debate_result', target: roomInfo.opponentId, result: finalResult })
        }
        onFinish(finalResult)
      } else {
        alert('Lỗi chấm điểm: ' + res.data.error)
        setPhase('debate') // Fallback
      }
    } catch(err) {
      alert('Lỗi kết nối máy chủ.')
      setPhase('debate')
    }
  }

  useEffect(() => {
    if (phase === 'debate' && debateTimeLeft === 0) {
      setPhase('scoring')
      if (isPlayerA || isSolo) executeScoring()
    }
  }, [debateTimeLeft, phase, isPlayerA, isSolo])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const getAvatarSrc = (name) => {
    if (name.includes('AI')) return '/assets/avatars/CuaXanh.png'
    const isMe = (name === roomData.playerA && isPlayerA) || (name === roomData.playerB && !isPlayerA)
    const stored = localStorage.getItem('kaiko_avatar_' + name)
    if (stored && stored !== 'none' && stored !== '') return stored
    if (isMe && user?.imageUrl) return user.imageUrl
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`
  }

  const getFrameSrc = (name) => {
    if (name.includes('AI')) return null
    const isMe = (name === roomData.playerA && isPlayerA) || (name === roomData.playerB && !isPlayerA)
    let frame = localStorage.getItem('kaiko_frame_' + name)
    if (isMe) frame = localStorage.getItem('kaiko_frame') || frame
    if (frame && frame !== 'none' && frame !== '') {
      const frameFileMap = { wood: 'wood.png', silver: 'silver.png', gold: 'gold.png', diamond: 'diamond.png', fire: 'fire.png', diamond_plus: 'KimCuongPlus.png' }
      return `/assets/frames/${frameFileMap[frame] || frame + '.png'}`
    }
    return null
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box', position: 'relative' }}>
      
      {systemAlert && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: systemAlert.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '10px 20px', borderRadius: '0px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', animation: 'slideDown 0.3s ease-out' }}>
          {systemAlert.msg}
        </div>
      )}

      {/* Top Action Buttons (Fixed top-right) */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', display: 'flex', gap: '12px', zIndex: 1000 }}>
        {bestFriends.length > 0 && mode?.includes('1v1') && (
          <>
            <select value={selectedHelper} onChange={e => setSelectedHelper(e.target.value)} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '30px', padding: '0 15px', height: '45px', outline: 'none', fontWeight: 'bold' }}>
              {bestFriends.map(f => <option key={f.username} value={f.username}>{f.username}</option>)}
            </select>
            <button onClick={handleRequestBestFriendHelp} disabled={requestingHelp} style={{ height: '45px', borderRadius: '30px', background: '#10b981', color: '#fff', border: 'none', padding: '0 20px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
              {requestingHelp ? '⏳' : '🆘'}
            </button>
          </>
        )}
        <button onClick={handleGetHint} disabled={gettingHint} style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#f59e0b', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} title="Gợi ý">
          {gettingHint ? '⏳' : '💡'}
        </button>
        <button onClick={onCancel} style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} title="Thoát">
          ✖
        </button>
        <button onClick={handleEndClick} disabled={phase === 'scoring' || (endRequested && debateTimeLeft > 0)} style={{ padding: '0 24px', height: '45px', borderRadius: '30px', background: phase === 'scoring' ? '#6b7280' : '#3b82f6', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
          {phase === 'scoring' ? 'Đang chấm điểm...' : (endRequested && debateTimeLeft > 0) ? 'Đang chờ...' : '🏁 Kết thúc'}
        </button>
      </div>

      {opponentWantsToEnd && phase === 'debate' && (
        <div style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(245,158,11,0.95)', color: '#000', padding: '15px 25px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>Đối thủ muốn kết thúc sớm và chấm điểm!</span>
          <button onClick={handleAcceptEnd} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Đồng ý</button>
          <button onClick={handleRejectEnd} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Từ chối</button>
        </div>
      )}

      {phase === 'topic_race' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <h1 style={{ color: '#fbbf24', fontSize: '3rem', marginBottom: '10px', textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>🏃 CUỘC ĐUA CHỦ ĐỀ</h1>
          <p style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '30px' }}>Ai nhập xong trước, người đó quyết định chủ đề!</p>
          <div style={{ fontSize: '4rem', fontWeight: 'bold', color: topicTimeLeft <= 5 ? '#ef4444' : '#fff', marginBottom: '30px', fontFamily: 'monospace' }}>
            00:{topicTimeLeft < 10 ? `0${topicTimeLeft}` : topicTimeLeft}
          </div>
          <form onSubmit={handleSubmitTopic} style={{ display: 'flex', gap: '10px', width: '80%', maxWidth: '600px' }}>
            <input 
              type="text" 
              value={topicInput} 
              onChange={e => setTopicInput(e.target.value)} 
              placeholder="Nhập chủ đề bạn muốn tranh biện..." 
              autoFocus
              style={{ flex: 1, padding: '18px 24px', fontSize: '1.2rem', borderRadius: '30px', border: '2px solid #a855f7', background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0 30px', borderRadius: '30px', fontSize: '1.2rem', fontWeight: 'bold' }}>Chốt!</button>
          </form>
          {isSolo && (
            <button onClick={() => setPhase('debate')} className="btn-secondary" style={{ marginTop: '20px', padding: '10px 30px', borderRadius: '30px', fontSize: '1.1rem', borderColor: '#10b981', color: '#10b981' }}>
              ▶️ Chơi luôn (Chủ đề ngẫu nhiên)
            </button>
          )}
        </div>
      )}

      <FallacyAlert fallacy={fallacy} speaker={fallacySpeaker} />
      
      {hint && (
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', padding: '10px 20px', borderRadius: '8px', marginBottom: '20px', color: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><strong>💡 Gợi ý của AI:</strong> {hint}</div>
          <button onClick={() => setHint('')} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
      )}

      <style>
        {`
          @keyframes moveRight {
            0% { transform: translateX(0) scale(1); opacity: 1; }
            80% { transform: translateX(160px) scale(1); opacity: 1; }
            100% { transform: translateX(180px) scale(1.5); opacity: 0; }
          }
          @keyframes moveLeft {
            0% { transform: translateX(0) scale(1); opacity: 1; }
            80% { transform: translateX(-160px) scale(1); opacity: 1; }
            100% { transform: translateX(-180px) scale(1.5); opacity: 0; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
          }
          .char-hurt {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
            filter: drop-shadow(0 0 10px red) sepia(1) hue-rotate(-50deg) saturate(5);
          }
        `}
      </style>

      {/* Topic Panel */}
      <div style={{ width: 'fit-content', minWidth: '300px', maxWidth: '800px', margin: '0 auto 15px auto', background: '#6b7280', padding: '10px 30px', borderRadius: '0px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', boxShadow: 'var(--shadow-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold' }}>💬 {currentTopic}</h2>
      </div>
        
      {/* Avatars and Timer row (Translucent Panel) */}
      <div style={{ width: 'fit-content', margin: '0 auto 20px auto', padding: '15px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', borderRadius: '30px', background: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          
        {/* Player A (Ủng hộ) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div className={effectA ? 'char-hurt' : ''} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
            <img src={getAvatarSrc(roomData.playerA)} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            {getFrameSrc(roomData.playerA) && (
              <img src={getFrameSrc(roomData.playerA)} style={{ position: 'absolute', top: '-15%', left: '-15%', width: '130%', height: '130%', zIndex: 2, pointerEvents: 'none' }} onError={(e) => e.target.style.display = 'none'} />
            )}
          </div>
          <strong style={{ color: 'var(--accent-primary)', display: 'block', marginTop: '6px', fontSize: '1rem' }}>{roomData.playerA}</strong>
          <div style={{ fontSize: '0.75rem', color: roomData.isLocalHost ? '#10b981' : 'var(--text-secondary)', fontWeight: 'bold' }}>{roomData.isLocalHost ? '(Bạn - Ủng hộ)' : '(Ủng hộ)'}</div>
          {effectB && <div style={{ position: 'absolute', top: '5px', left: '50px', fontSize: '2rem', animation: 'moveRight 0.8s linear forwards', zIndex: 10 }}>{effectB === 'fire' ? '🔥' : effectB === 'bubble' ? '🫧' : effectB === 'rock' ? '🪨' : effectB}</div>}
        </div>

        {/* Timer */}
        {phase === 'debate' ? (
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: debateTimeLeft <= 60 ? '#ff4b4b' : '#38bdf8', textAlign: 'center', fontFamily: 'monospace', textShadow: '0 2px 10px rgba(0,0,0,0.2)', width: '120px' }}>
            ⏱ {formatTime(debateTimeLeft)}
          </div>
        ) : (
          <div style={{ width: '120px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang chờ...</div>
        )}
          
        {/* Player B (Phản đối) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div className={effectB ? 'char-hurt' : ''} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(168,85,247,0.3)' }}>
            <img src={getAvatarSrc(roomData.playerB)} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            {getFrameSrc(roomData.playerB) && (
              <img src={getFrameSrc(roomData.playerB)} style={{ position: 'absolute', top: '-15%', left: '-15%', width: '130%', height: '130%', zIndex: 2, pointerEvents: 'none' }} onError={(e) => e.target.style.display = 'none'} />
            )}
          </div>
          <strong style={{ color: '#a855f7', display: 'block', marginTop: '6px', fontSize: '1rem' }}>{roomData.playerB}</strong>
          <div style={{ fontSize: '0.75rem', color: !roomData.isLocalHost ? '#10b981' : 'var(--text-secondary)', fontWeight: 'bold' }}>{!roomData.isLocalHost ? '(Bạn - Phản đối)' : '(Phản đối)'}</div>
          {effectA && <div style={{ position: 'absolute', top: '5px', right: '50px', fontSize: '2rem', animation: 'moveLeft 0.8s linear forwards', zIndex: 10 }}>{effectA === 'fire' ? '🔥' : effectA === 'bubble' ? '🫧' : effectA === 'rock' ? '🪨' : effectA}</div>}
        </div>

      </div>

      {/* Action buttons were moved to the top */}

      <div className="glass-panel" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
            <div style={{ fontSize: '3rem' }}>✍️</div>
            <h3>Bắt đầu cuộc tranh biện</h3>
            <p>Gõ liên tục các lập luận của bạn. Hết 30 phút hệ thống sẽ tự động chấm điểm.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isA = msg.speaker === 'A'
          const isMe = (isPlayerA && isA) || (!isPlayerA && !isA)
          const speakerName = isA ? roomData.playerA : roomData.playerB
          
          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', gap: '10px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
              
              {/* Avatar Icon */}
              <div style={{ flexShrink: 0, marginTop: '20px' }}>
                <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={getAvatarSrc(speakerName)} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  {getFrameSrc(speakerName) && (
                    <img src={getFrameSrc(speakerName)} style={{ position: 'absolute', top: '-15%', left: '-15%', width: '130%', height: '130%', zIndex: 2, pointerEvents: 'none' }} onError={(e) => e.target.style.display = 'none'} />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isA ? `${roomData.playerA} (Ủng Hộ)` : `${roomData.playerB} (Phản Đối)`}
                </div>
                <div style={{
                  background: isMe ? '#4f46e5' : '#7c3aed',
                  padding: '12px 18px',
                  borderRadius: '16px',
                  borderTopRightRadius: isMe ? '4px' : '16px',
                  borderTopLeftRadius: !isMe ? '4px' : '16px',
                  color: '#ffffff',
                  lineHeight: '1.5',
                  boxShadow: msg.isExcellent ? '0 0 15px rgba(16,185,129,0.5)' : '0 2px 5px rgba(0,0,0,0.2)'
                }}>
                  {msg.text}
                </div>
              {(msg.fallacy || msg.isAiGenerated || msg.isExcellent) && (
                <div style={{ marginTop: '5px', display: 'flex', gap: '5px', justifyContent: isMe ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
                  {msg.isExcellent && <span style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px' }}>🌟 Cực Phẩm</span>}
                  {msg.fallacy && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px' }}>Ngụy biện: {msg.fallacy}</span>}
                  {msg.isAiGenerated && <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px' }}>🤖 Nghi vấn dùng AI</span>}
                </div>
              )}
              </div>
            </div>
          )
        })}
        {isAiThinking && (
          <div style={{ alignSelf: 'flex-start', color: '#a855f7', fontStyle: 'italic', padding: '10px' }}>
            AI đang gõ...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea 
          ref={inputRef}
          value={input} 
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = '56px'
            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
          }} 
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={phase === 'scoring' ? "Trận đấu đã kết thúc..." : "Gõ lập luận... (Shift + Enter để xuống dòng)"}
          disabled={isAiThinking || phase !== 'debate'}
          style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: '1.1rem', resize: 'none', height: '56px', maxHeight: '150px', outline: 'none' }}
        />
        <button 
          type="submit" 
          disabled={isAiThinking || phase !== 'debate'}
          className="btn-primary"
          style={{ padding: '0 30px', height: '56px', borderRadius: '12px', fontWeight: 'bold' }}
        >
          Gửi
        </button>
      </form>
    </div>
  )
}