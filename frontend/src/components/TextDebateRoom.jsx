import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import FallacyAlert from './FallacyAlert'

const API_BASE = 'http://localhost:8000'

export default function TextDebateRoom({ roomData, roomInfo, mode, username, onFinish, onCancel, registerHandler, sendMessage }) {
  const [messages, setMessages] = useState([]) // { id, speaker, text, fallacy, isAiGenerated, isExcellent }
  const [input, setInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  
  const [fallacy, setFallacy] = useState(null)
  const [fallacySpeaker, setFallacySpeaker] = useState('')
  const [fallaciesA, setFallaciesA] = useState([])
  const [fallaciesB, setFallaciesB] = useState([])
  
  // Custom alerts for excellent or off_topic
  const [systemAlert, setSystemAlert] = useState(null)

  const chatEndRef = useRef(null)

  // Identify who is who
  const isSolo = mode === 'text_solo'
  const isPlayerA = roomData.isLocalHost

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiThinking, systemAlert])

  const handleInputChange = (e) => {
    setInput(e.target.value)
  }

  // Handle incoming messages for Multiplayer
  useEffect(() => {
    if (isSolo || !registerHandler) return
    const cleanupChat = registerHandler('chat_msg', (data) => {
      setMessages(prev => [...prev, data.msg])
      if (data.msg.fallacy && data.msg.speaker !== (isPlayerA ? 'A' : 'B')) {
        setFallacy(data.msg.fallacy)
        setFallacySpeaker(data.msg.speaker === 'A' ? roomData.playerA : roomData.playerB)
        if (data.msg.speaker === 'A') setFallaciesA(prev => [...prev, data.msg.fallacy])
        else setFallaciesB(prev => [...prev, data.msg.fallacy])
      }
    })
    return () => {
      cleanupChat && cleanupChat()
    }
  }, [isSolo, registerHandler, isPlayerA, roomData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isScoring) return
    
    const userText = input.trim()
    setInput('')
    
    const speakerLabel = isPlayerA ? 'A' : 'B'
    const speakerName = isPlayerA ? roomData.playerA : roomData.playerB

    const newMsg = { id: Date.now(), speaker: speakerLabel, text: userText, fallacy: null, isAiGenerated: false, isExcellent: false }
    setMessages(prev => [...prev, newMsg])

    // Phân tích text
    try {
      const res = await axios.post(`${API_BASE}/analyze-text`, {
        text: userText, speaker: speakerName, topic: roomData.topic
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
        // Bonus exp/points có thể xử lý khi kết thúc game
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
          topic: roomData.topic, transcript_a: transcriptA, transcript_b: transcriptB
        })
        
        const aiText = aiRes.data.response || 'Tôi không có phản hồi.'
        setMessages(prev => [...prev, { id: Date.now(), speaker: 'B', text: aiText, fallacy: null, isAiGenerated: false }])
      } catch(err) {
        setMessages(prev => [...prev, { id: Date.now(), speaker: 'B', text: 'AI đang bận, xin lỗi.', fallacy: null, isAiGenerated: false }])
      } finally {
        setIsAiThinking(false)
      }
    }
  }

  const handleEnd = async () => {
    setIsScoring(true)
    const transcriptA = messages.filter(m => m.speaker === 'A').map(m => m.text).join('. ') || 'Người chơi chưa phát biểu.'
    const transcriptB = messages.filter(m => m.speaker === 'B').map(m => m.text).join('. ') || 'Đối thủ chưa phát biểu.'
    
    try {
      const res = await axios.post(`${API_BASE}/score`, {
        topic: roomData.topic,
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
        onFinish({
          scores: res.data.scores,
          playerA: roomData.playerA,
          playerB: roomData.playerB,
          topic: roomData.topic,
          transcript_a: transcriptA,
          transcript_b: transcriptB
        })
      } else {
        alert('Lỗi chấm điểm: ' + res.data.error)
        setIsScoring(false)
      }
    } catch(err) {
      alert('Lỗi kết nối máy chủ.')
      setIsScoring(false)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box', position: 'relative' }}>
      
      {systemAlert && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: systemAlert.type === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)', color: '#fff', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', animation: 'slideDown 0.3s ease-out' }}>
          {systemAlert.msg}
        </div>
      )}

      <FallacyAlert fallacy={fallacy} speaker={fallacySpeaker} />
      
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem' }}>💬 {roomData.topic}</h2>
          <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{roomData.playerA} (Ủng Hộ)</span> 
            {' '}vs{' '} 
            <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{roomData.playerB} (Phản Đối)</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ padding: '10px 20px' }}>Thoát</button>
          <button onClick={handleEnd} className="btn-primary" disabled={isScoring} style={{ padding: '10px 20px', background: '#f59e0b', borderColor: '#f59e0b' }}>
            {isScoring ? 'Đang chấm...' : '🏁 Kết thúc & Chấm điểm'}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
            <div style={{ fontSize: '3rem' }}>✍️</div>
            <h3>Bắt đầu cuộc tranh biện</h3>
            <p>Gõ liên tục các lập luận của bạn. Ai có ý tưởng có thể gửi ngay không cần đợi lượt!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isA = msg.speaker === 'A'
          const isMe = (isPlayerA && isA) || (!isPlayerA && !isA)
          
          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: isMe ? 'right' : 'left' }}>
                {isA ? `${roomData.playerA} (Ủng Hộ)` : `${roomData.playerB} (Phản Đối)`}
              </div>
              <div style={{
                background: isMe ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)',
                border: `1px solid ${isMe ? 'rgba(99,102,241,0.3)' : 'rgba(168,85,247,0.3)'}`,
                padding: '12px 18px',
                borderRadius: '16px',
                borderTopRightRadius: isMe ? '4px' : '16px',
                borderTopLeftRadius: !isMe ? '4px' : '16px',
                color: '#fff',
                lineHeight: '1.5',
                boxShadow: msg.isExcellent ? '0 0 15px rgba(16,185,129,0.5)' : 'none'
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
          )
        })}
        {isAiThinking && (
          <div style={{ alignSelf: 'flex-start', color: '#a855f7', fontStyle: 'italic', padding: '10px' }}>
            AI đang gõ...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={handleInputChange} 
          placeholder="Gõ lập luận của bạn vào đây..."
          disabled={isAiThinking || isScoring}
          style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '1.1rem' }}
        />
        <button 
          type="submit" 
          disabled={isAiThinking || isScoring}
          className="btn-primary"
          style={{ padding: '0 30px', borderRadius: '12px', fontWeight: 'bold' }}
        >
          Gửi
        </button>
      </form>
    </div>
  )
}
