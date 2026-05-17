import { useState, useEffect } from 'react'

export default function ReadyCheck({ matchInfo, onReady, onCancel, getDisplayName }) {
  const [timeLeft, setTimeLeft] = useState(30)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!isReady) {
        // Hết 30s không bấm sẵn sàng -> Bị trừ 1 điểm và tự động sẵn sàng
        alert("Hết 30s! Bạn đã bị trừ 1 điểm và tự động chuyển trạng thái Sẵn Sàng.")
        try {
          fetch('http://localhost:8000/deduct-penalty', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: localStorage.getItem('kaiko_username') || 'guest' })
          })
        } catch(e) {}
        handleReady()
      }
      return
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, isReady])

  const handleReady = () => {
    setIsReady(true)
    onReady()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, #1a1d27 0%, #0f1117 100%)', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3.5rem', textAlign: 'center', width: '100%', maxWidth: '500px', border: '1px solid rgba(99, 102, 241, 0.3)', boxShadow: '0 0 50px rgba(99, 102, 241, 0.2)' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', marginBottom: '1rem', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>Đã tìm thấy trận!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '2.5rem' }}>
          Đối thủ của bạn: <strong style={{ color: '#a855f7', fontSize: '1.4rem' }}>{matchInfo.opponentName || matchInfo.opponentId}</strong>
        </p>
        
        <div style={{ 
          width: '120px', height: '120px', borderRadius: '50%', 
          border: `4px solid ${timeLeft > 10 ? '#10b981' : '#ef4444'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)',
          margin: '0 auto 2.5rem',
          boxShadow: timeLeft > 10 ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 0 20px rgba(239, 68, 68, 0.4)',
          transition: 'all 0.5s ease'
        }}>
          {timeLeft}s
        </div>

        {isReady ? (
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <p style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Đang chờ đối thủ xác nhận...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={handleReady} style={{ flex: 1, padding: '14px', fontSize: '1.2rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
              CHẤP NHẬN
            </button>
            <button onClick={onCancel} style={{ flex: 1, padding: '14px', fontSize: '1.2rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              TỪ CHỐI
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
