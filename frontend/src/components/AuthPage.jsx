import { useState } from 'react'
import axios from 'axios'
import { useSignIn, useSignUp } from '@clerk/clerk-react'

const API_BASE = 'http://localhost:8000'

export default function AuthPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Clerk hooks (chỉ dùng nếu Clerk được cấu hình)
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()

  const handleGuest = () => {
    onLogin(`Guest_${Math.floor(Math.random() * 10000)}`)
  }

  // Đăng nhập bằng Google (Clerk OAuth)
  const handleGoogleLogin = async () => {
    if (!signInLoaded || !signIn) {
      alert('Đăng nhập Google chưa được cấu hình. Vui lòng dùng tài khoản KaiKo.')
      return
    }
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      })
    } catch (err) {
      console.error('Google login error:', err)
      setErrorMsg('Đăng nhập Google thất bại. Thử lại sau.')
    }
  }

  // Đăng nhập / Đăng ký bằng tài khoản KaiKo
  const handleAuth = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    try {
      const endpoint = isLogin ? '/login' : '/register'
      const res = await axios.post(`${API_BASE}${endpoint}`, { username, password })
      if (res.data.success) {
        if (!isLogin) {
          alert('Đăng ký thành công! Hãy đăng nhập.')
          setIsLogin(true)
        } else {
          onLogin(res.data.username || username)
        }
      } else {
        setErrorMsg(res.data.error)
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '3.5rem', margin: '0 0 0.5rem', color: 'var(--text-primary)', letterSpacing: '-1px' }}>
            <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 20px rgba(99, 102, 241, 0.5)' }}>Kai</span>Ko
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Nền tảng Tranh biện AI & Đối kháng</p>
        </div>

        {/* Đăng nhập Google */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%', maxWidth: '400px', padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            background: '#fff', color: '#1f1f1f',
            border: '1px solid #dadce0', borderRadius: '8px',
            fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
        >
          <svg width="22" height="22" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Đăng nhập với Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }}></div>
          <span style={{ padding: '0 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>hoặc dùng tài khoản KaiKo</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }}></div>
        </div>

        {/* Form đăng nhập KaiKo */}
        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.25)', width: '100%', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <h2 style={{ color: 'var(--text-primary)', textAlign: 'center', margin: '0 0 1.5rem', fontSize: '1.4rem' }}>
            {isLogin ? '🔐 Đăng Nhập KaiKo' : '📝 Đăng Ký KaiKo'}
          </h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
              required
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
              required
            />
            {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: 0, textAlign: 'center' }}>{errorMsg}</p>}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ padding: '12px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.25rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? '⏳ Đang xử lý...' : (isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản')}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={() => { setIsLogin(!isLogin); setErrorMsg('') }}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.95rem', textDecoration: 'underline' }}
            >
              {isLogin ? 'Chưa có tài khoản KaiKo? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ padding: '0 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>hoặc</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        {/* Khách */}
        <button
          onClick={handleGuest}
          style={{
            width: '100%', maxWidth: '400px', padding: '12px', fontSize: '1rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)',
            border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          👤 Tiếp tục với tư cách Khách
        </button>

        {/* Khu vực test giám khảo */}
        <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(239, 68, 68, 0.08)', padding: '16px', borderRadius: '12px', border: '1px dashed rgba(239,68,68,0.4)', marginTop: '8px' }}>
          <h3 style={{ color: '#ef4444', textAlign: 'center', marginTop: 0, marginBottom: '12px', fontSize: '0.95rem' }}>🧪 Tài khoản Giả lập (Demo Đồ Án)</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => onLogin('Test_CuaNon')} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #9ca3af', background: 'rgba(0,0,0,0.4)', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>Lv 5 (Cua Non)</button>
            <button onClick={() => onLogin('Test_CuaCum')} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #3b82f6', background: 'rgba(0,0,0,0.4)', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem' }}>Lv 45 (Cua Cùm)</button>
            <button onClick={() => onLogin('Test_CuaHoangDe')} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #facc15', background: 'rgba(0,0,0,0.4)', color: '#facc15', cursor: 'pointer', fontSize: '0.85rem' }}>Lv 101 (Hoàng Đế)</button>
          </div>
        </div>

      </div>
    </div>
  )
}
