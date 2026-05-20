import React, { useEffect } from 'react'

export default function HomePage({ onPlay }) {
  useEffect(() => {
    // Add particles on mount
    const container = document.createElement('div')
    container.id = 'home-particles'
    document.body.appendChild(container)
    for (let i = 0; i < 15; i++) {
      const p = document.createElement('div')
      p.className = 'particle'
      p.style.left = `${Math.random() * 100}vw`
      p.style.width = `${Math.random() * 5 + 2}px`
      p.style.height = p.style.width
      p.style.animationDuration = `${Math.random() * 10 + 5}s`
      p.style.animationDelay = `${Math.random() * 5}s`
      container.appendChild(p)
    }
    return () => {
      document.getElementById('home-particles')?.remove()
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'url("/assets/backgrounds/homepage_splash.jpg") center/cover no-repeat, url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop") center/cover no-repeat',
      position: 'relative',
      padding: '2rem'
    }}>
      {/* Overlay để làm mờ nền */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.8), rgba(15,23,42,0.95))' }}></div>

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '900px' }}>
        <h1 className="animate-fade-in" style={{ fontSize: '7rem', margin: '0 0 1rem', color: 'var(--text-primary)', letterSpacing: '-2px', textShadow: '0 10px 40px rgba(99, 102, 241, 0.8)' }}>
          <span style={{ color: 'var(--accent-primary)' }}>Kai</span>Ko
        </h1>
        <p style={{ fontSize: '2rem', color: '#e2e8f0', marginBottom: '4rem', fontWeight: '300' }}>
          Đấu Trường Tranh Biện Trí Tuệ Nhân Tạo
        </p>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <button 
            onClick={onPlay}
            className="btn-primary hover-scale btn-play-shine"
            style={{ 
              padding: '24px 64px', 
              fontSize: '2rem', 
              borderRadius: '50px', 
              fontWeight: 'bold', 
              boxShadow: '0 0 50px rgba(99, 102, 241, 0.6)', 
              textTransform: 'uppercase', 
              letterSpacing: '2px', 
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Chơi Ngay
          </button>
        </div>

        <div style={{ marginTop: '6rem', display: 'flex', gap: '4rem', justifyContent: 'center', opacity: 0.9 }}>
          <div className="glass-card" style={{ textAlign: 'center', padding: '20px', borderRadius: '16px', minWidth: '180px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🤖</div>
            <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>Phân tích Real-time</div>
          </div>
          <div className="glass-card" style={{ textAlign: 'center', padding: '20px', borderRadius: '16px', minWidth: '180px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚔️</div>
            <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>Đối kháng 1v1</div>
          </div>
          <div className="glass-card" style={{ textAlign: 'center', padding: '20px', borderRadius: '16px', minWidth: '180px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏆</div>
            <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>Hệ thống Rank</div>
          </div>
        </div>
      </div>
    </div>
  )
}


