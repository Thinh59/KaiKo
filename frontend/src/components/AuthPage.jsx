import { useState } from 'react'
import axios from 'axios'
import { useSignIn, useSignUp } from '@clerk/clerk-react'

import { API_BASE } from '../config'

export function AuthPageWithClerk({ onLogin }) {
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()

  return (
    <AuthPage
      onLogin={onLogin}
      clerkEnabled
      clerkAuth={{ signIn, signInLoaded, signUp, signUpLoaded }}
    />
  )
}

export default function AuthPage({ onLogin, clerkEnabled = false, clerkAuth = {} }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const getPasswordStrength = (pass) => {
    if (pass.length === 0) return { label: '', color: 'transparent', width: '0%' };
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { label: 'Yếu', color: '#ef4444', width: '33%' };
    if (score <= 4) return { label: 'Trung bình', color: '#eab308', width: '66%' };
    return { label: 'Mạnh', color: '#22c55e', width: '100%' };
  }
  const strength = getPasswordStrength(password);

  const {
    signIn,
    signInLoaded = false
  } = clerkAuth

  const handleGuest = () => {
    onLogin(`Guest_${Math.floor(Math.random() * 10000)}`)
  }

  // Đăng nhập bằng Google (Clerk OAuth)
  const handleGoogleLogin = async () => {
    if (!clerkEnabled || !signInLoaded || !signIn) {
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

    if (!isLogin) {
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp!')
        return
      }
      if (!email) {
        setErrorMsg('Vui lòng nhập email xác thực!')
        return
      }
    }

    setLoading(true)
    try {
      const endpoint = isLogin ? '/login' : '/register'
      const payload = isLogin ? { username, password } : { username, email, password }
      const res = await axios.post(`${API_BASE}${endpoint}`, payload)
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
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '3.5rem', margin: '0 0 0.5rem', color: '#ffe9c2', letterSpacing: '-1px', textShadow: '0 0 18px rgba(251,146,60,0.55)' }}>
            <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 20px rgba(99, 102, 241, 0.5)' }}>Kai</span>Ko
          </h1>
          <p style={{ color: '#ffe8bf', fontSize: '1.1rem', textShadow: '0 2px 10px rgba(0,0,0,0.65)' }}>Nền tảng Tranh biện AI & Đối kháng</p>
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
        <div style={{ background: 'rgba(26,10,2,0.55)', backdropFilter: 'blur(6px)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(251, 146, 60, 0.45)', width: '100%', maxWidth: '400px', boxShadow: '0 16px 36px rgba(0,0,0,0.45)' }}>
          <h2 style={{ color: '#fff2d6', textAlign: 'center', margin: '0 0 1.5rem', fontSize: '1.4rem', textShadow: '0 2px 8px rgba(0,0,0,0.65)' }}>
            {isLogin ? '🔐 Đăng Nhập KaiKo' : '📝 Đăng Ký KaiKo'}
          </h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem', outline: 'none' }}
              required
            />
            {!isLogin && (
              <input
                type="email"
                placeholder="Email xác thực"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem', outline: 'none' }}
                required
              />
            )}
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem', outline: 'none' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {!isLogin && password.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '-8px', marginBottom: '4px' }}>
                <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s' }}></div>
                </div>
                <span style={{ fontSize: '0.8rem', color: strength.color, textAlign: 'right' }}>Độ mạnh: {strength.label}</span>
              </div>
            )}
            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Xác nhận mật khẩu"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem', outline: 'none' }}
                  required
                />
              </div>
            )}
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



      </div>
    </div>
  )
}
