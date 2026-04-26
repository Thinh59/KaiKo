import { useState } from 'react'
import axios from 'axios'

export default function AuthPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const handleAuth = async (action) => {
    setErrorMsg('')
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đủ tên đăng nhập và mật khẩu.')
      return
    }
    
    setIsLoading(true)
    try {
      const res = await axios.post(`http://localhost:8000/${action}`, {
        username,
        password
      })
      
      if (res.data.success) {
        if (action === 'register') {
          alert('Đăng ký thành công! Đang tự động đăng nhập...')
        }
        onLogin(username)
      } else {
        setErrorMsg(res.data.error || 'Có lỗi xảy ra')
      }
    } catch (err) {
      setErrorMsg('Không thể kết nối đến server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuest = () => {
    onLogin(`Guest_${Math.floor(Math.random() * 10000)}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(circle at center, #1a1d27 0%, #0f1117 100%)'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        padding: '3.5rem',
        width: '100%',
        maxWidth: '480px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.2)'
      }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '3.5rem', margin: '0 0 0.5rem', color: 'var(--text-primary)', letterSpacing: '-1px' }}>
            <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 20px rgba(99, 102, 241, 0.5)' }}>Kai</span>Ko
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Nền tảng Tranh biện AI & Đối kháng</p>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <input
            type="text"
            placeholder="Tên đăng nhập"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: 'var(--radius-md)', boxSizing: 'border-box' }}
          />
          
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: 'var(--radius-md)', boxSizing: 'border-box' }}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={() => handleAuth('login')}
              disabled={isLoading}
              className="btn-primary"
              style={{ flex: 1, padding: '14px', fontSize: '1.1rem', borderRadius: 'var(--radius-md)' }}
            >
              {isLoading ? 'Đang tải...' : 'Đăng nhập'}
            </button>
            <button
              onClick={() => handleAuth('register')}
              disabled={isLoading}
              style={{
                flex: 1, padding: '14px', fontSize: '1.1rem', borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)', cursor: 'pointer', transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
            >
              Đăng ký
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            <span style={{ padding: '0 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>hoặc</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          </div>

          <button
            onClick={handleGuest}
            style={{
              width: '100%', padding: '14px', fontSize: '1.1rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Tiếp tục với tư cách Khách
          </button>
        </div>
      </div>
    </div>
  )
}
