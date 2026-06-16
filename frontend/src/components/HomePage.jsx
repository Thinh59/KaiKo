import React, { useState, useEffect } from 'react'

export default function HomePage({ onPlay, theme }) {
  const [activeTab, setActiveTab] = useState('home')

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

  const renderShowcaseContent = () => {
    switch (activeTab) {
      case 'ai':
        return (
          <div className="showcase-container" style={{ display: 'flex', width: '100%', maxWidth: '1100px', alignItems: 'center', justifyContent: 'space-between', gap: '3rem' }}>
            {/* Mascot Column */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="mascot-bubble-home">
                🤖 Tớ sẽ dùng sức mạnh của <strong>AI Gemini</strong> để phân tích bài viết, vạch trần các lỗi ngụy biện và tính điểm phản biện của bạn theo thời gian thực!
              </div>
              <img 
                className="floating-mascot-home"
                src="/assets/mascots/mascot.png" 
                alt="Mascot" 
                style={{ width: '220px', height: '220px', filter: 'drop-shadow(0 15px 30px rgba(99, 102, 241, 0.4))' }} 
              />
            </div>
            {/* Mock UI Column */}
            <div style={{ flex: '1.3' }}>
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', border: '1px solid rgba(249, 115, 22, 0.45)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: 'rgba(15, 23, 42, 0.75)' }}>
                {/* Mock Window Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308' }}></div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', fontFamily: 'monospace' }}>GEMINI_ANALYZE_ENGINE v1.2</span>
                </div>
                {/* Mock Input */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Bài lập luận của bạn:</div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', color: '#e2e8f0', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "Chúng ta không nên phát triển trí tuệ nhân tạo nữa. AI sẽ chiếm đoạt mọi công việc và đẩy nhân loại vào cảnh nghèo đói cùng cực mãi mãi..."
                  </div>
                </div>
                {/* Mock Analysis */}
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>⚠️ Phát hiện Ngụy Biện (Fallacy)</span>
                    <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>-5 Điểm</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#fca5a5', lineHeight: '1.4' }}>
                    <strong>Dốc đứng trơn trượt (Slippery Slope):</strong> Bạn lập luận rằng việc phát triển AI sẽ kéo theo hậu quả thảm khốc một cách tuyệt đối mà không có bằng chứng khoa học cụ thể liên kết.
                  </div>
                </div>
                {/* Mock Graph/Score */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '16px', alignItems: 'center' }}>
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Điểm Thuyết Phục (AI Evaluation):</span>
                    <div className="exp-bar-track" style={{ height: '14px' }}>
                      <div className="exp-bar-fill" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.3)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>TỔNG ĐIỂM</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>78/100</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'pvp':
        return (
          <div className="showcase-container" style={{ display: 'flex', width: '100%', maxWidth: '1100px', alignItems: 'center', justifyContent: 'space-between', gap: '3rem' }}>
            {/* Mascot Column */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="mascot-bubble-home">
                ⚔️ Đọ sức tư duy đối kháng trực tiếp 1v1! Bạn sẽ được gán vai ngẫu nhiên (Ủng hộ hoặc Phản đối) để bảo vệ lập trường của mình!
              </div>
              <img 
                className="floating-mascot-home"
                src="/assets/mascots/mascot.png" 
                alt="Mascot" 
                style={{ width: '220px', height: '220px', filter: 'drop-shadow(0 15px 30px rgba(99, 102, 241, 0.4))' }} 
              />
            </div>
            {/* Mock UI Column */}
            <div style={{ flex: '1.3' }}>
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', border: '1px solid rgba(249, 115, 22, 0.45)', background: 'rgba(15, 23, 42, 0.75)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>ĐẤU TRƯỜNG TRANH BIỆN 1v1</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Chủ đề: Mạng xã hội đang làm con người xa cách hơn?</div>
                </div>
                {/* PVP Battle Representation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '20px 0' }}>
                  {/* Player Left */}
                  <div className="glass-card" style={{ flex: '1', padding: '16px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.4)', background: 'rgba(0, 0, 0, 0.2)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🦀</div>
                    <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.95rem' }}>Cua Lập Luận</div>
                    <div style={{ background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginTop: '6px', display: 'inline-block' }}>ỦNG HỘ (PRO)</div>
                  </div>
                  {/* VS Middle */}
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', textShadow: '0 0 10px rgba(249, 115, 22, 0.8)', padding: '0 10px' }}>VS</div>
                  {/* Player Right */}
                  <div className="glass-card" style={{ flex: '1', padding: '16px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(0, 0, 0, 0.2)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🦞</div>
                    <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.95rem' }}>Cua Biện Hộ</div>
                    <div style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginTop: '6px', display: 'inline-block' }}>PHẢN ĐỐI (CON)</div>
                  </div>
                </div>
                {/* Chat Previews */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#c7d2fe' }}>💬 <strong>Cua Lập Luận:</strong> Mạng xã hội gắn kết hàng triệu người vượt qua khoảng cách địa lý...</div>
                  <div style={{ fontSize: '0.85rem', color: '#fecaca' }}>💬 <strong>Cua Biện Hộ:</strong> Nhưng nó lại làm chúng ta bỏ lơ những người thân thiết bên cạnh...</div>
                </div>
                {/* Timer */}
                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
                  ⏱️ Thời gian đợt nói: <span style={{ color: 'var(--accent-primary)' }}>01:45</span>
                </div>
              </div>
            </div>
          </div>
        )
      case 'rank':
        return (
          <div className="showcase-container" style={{ display: 'flex', width: '100%', maxWidth: '1100px', alignItems: 'center', justifyContent: 'space-between', gap: '3rem' }}>
            {/* Mascot Column */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="mascot-bubble-home">
                🏆 Tích luỹ điểm số sau mỗi trận đấu tranh biện để thăng hạng! Hãy bắt đầu từ một chú <strong>Cua Non</strong> và trở thành bậc thầy <strong>Hoàng Đế Cua</strong>!
              </div>
              <img 
                className="floating-mascot-home"
                src="/assets/mascots/mascot.png" 
                alt="Mascot" 
                style={{ width: '220px', height: '220px', filter: 'drop-shadow(0 15px 30px rgba(99, 102, 241, 0.4))' }} 
              />
            </div>
            {/* Mock UI Column */}
            <div style={{ flex: '1.3' }}>
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', border: '1px solid rgba(249, 115, 22, 0.45)', background: 'rgba(15, 23, 42, 0.75)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: '20px' }}>HỆ THỐNG CẤP BẬC / RANK</div>
                {/* Rank cards row */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Card 1 */}
                  <div className="glass-card rarity-common" style={{ flex: '1', padding: '16px 8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🦀</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>Cua Non</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>Lv 1 - 15</div>
                  </div>
                  {/* Card 2 */}
                  <div className="glass-card rarity-rare" style={{ flex: '1', padding: '16px 8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🦞</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#3b82f6' }}>Cua Cùm</div>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '4px' }}>Lv 40 - 55</div>
                  </div>
                  {/* Card 3 */}
                  <div className="glass-card rarity-legendary" style={{ flex: '1', padding: '16px 8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '6px' }}>👑</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fbbf24' }}>Hoàng Đế</div>
                    <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '4px' }}>Lv 100+</div>
                  </div>
                </div>
                {/* Progress bar preview */}
                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                    <span>Xếp hạng hiện tại: Cua Cùm (Lv.45)</span>
                    <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>850 / 1000 EXP</span>
                  </div>
                  <div className="exp-bar-track" style={{ height: '16px' }}>
                    <div className="exp-bar-fill" style={{ width: '85%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default: // 'home'
        return (
          <div className="showcase-container" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Shifting background light ray for motion */}
            <div className="glowing-ray" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
            
            <h1 className="animate-fade-in floating-title-home" style={{ 
              fontSize: '7.5rem', 
              margin: '0 0 1rem', 
              color: 'var(--accent-primary)', 
              letterSpacing: '-2px', 
              textShadow: '0 10px 40px rgba(249, 115, 22, 0.6)' 
            }}>
              KaiKo
            </h1>
            <p style={{ fontSize: '2.1rem', color: '#e2e8f0', marginBottom: '4rem', fontWeight: '300', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
              Đấu Trường Tranh Biện Trí Tuệ Nhân Tạo
            </p>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button 
                onClick={onPlay}
                className="btn-primary hover-scale btn-play-shine"
                style={{ 
                  padding: '24px 64px', 
                  fontSize: '2.2rem', 
                  borderRadius: '50px', 
                  fontWeight: 'bold', 
                  textTransform: 'uppercase', 
                  letterSpacing: '2px', 
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  animation: 'pulseGlowButton 3s ease-in-out infinite'
                }}
              >
                Start Now
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: theme === 'bright' 
        ? 'url("/assets/backgrounds/homepage_splash_bright.png") center/cover no-repeat'
        : 'url("/assets/backgrounds/homepage_splash.jpg") center/cover no-repeat, url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop") center/cover no-repeat',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatMascotHome {
          0%, 100% { transform: translateY(0px) rotate(-1deg) scaleX(-1); }
          50% { transform: translateY(-12px) rotate(1deg) scaleX(-1); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatTitleHome {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes rotateRayHome {
          0% { transform: rotate(0deg); opacity: 0.15; }
          50% { transform: rotate(180deg); opacity: 0.35; }
          100% { transform: rotate(360deg); opacity: 0.15; }
        }
        @keyframes pulseGlowButton {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(249, 115, 22, 0.6); }
          50% { transform: scale(1.04); box-shadow: 0 0 50px rgba(249, 115, 22, 0.9); }
        }
        .floating-mascot-home {
          animation: floatMascotHome 4s ease-in-out infinite;
          transform: scaleX(-1);
        }
        .floating-title-home {
          animation: floatTitleHome 6s ease-in-out infinite;
        }
        .glowing-ray {
          position: absolute;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, transparent 70%);
          z-index: -1;
          pointer-events: none;
          animation: rotateRayHome 25s linear infinite;
        }
        .showcase-container {
          animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .home-tab-btn {
          position: relative;
          color: #fffbeb;
          font-size: 1.05rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.4rem 0.8rem;
          transition: all 0.3s ease;
          background: none;
          border: none;
          font-family: 'Outfit', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .home-tab-btn:hover {
          color: var(--accent-primary);
          text-shadow: 0 0 8px rgba(249, 115, 22, 0.7);
        }
        .home-tab-btn.active {
          color: var(--accent-primary);
          font-weight: 700;
          text-shadow: 0 0 12px rgba(249, 115, 22, 0.9);
        }
        .tab-separator {
          color: var(--accent-primary);
          font-size: 0.75rem;
          opacity: 0.6;
          text-shadow: 0 0 8px rgba(249, 115, 22, 0.8);
          pointer-events: none;
        }
        .mascot-bubble-home {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(249, 115, 22, 0.45);
          color: #fffbeb;
          padding: 1.2rem;
          border-radius: 18px;
          font-size: 0.95rem;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
          position: relative;
          max-width: 280px;
          line-height: 1.5;
          text-align: left;
        }
        .mascot-bubble-home::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          border-width: 8px 8px 0;
          border-style: solid;
          border-color: rgba(15, 23, 42, 0.85) transparent transparent transparent;
        }
      `}} />

      {/* Overlay to blur/darken background */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.8), rgba(15,23,42,0.95))', zIndex: 0 }}></div>

      {/* Header/Navbar */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem 3rem',
        width: '100%',
        boxSizing: 'border-box',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(251, 146, 60, 0.15)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Logo */}
        {activeTab !== 'home' ? (
          <div 
            onClick={() => setActiveTab('home')}
            style={{ 
              cursor: 'pointer',
              fontSize: '2.2rem', 
              fontWeight: 'bold', 
              color: 'var(--accent-primary)', 
              fontFamily: 'var(--font-heading)',
              textShadow: '0 0 15px rgba(249, 115, 22, 0.4)' 
            }}
          >
            KaiKo
          </div>
        ) : (
          <div style={{ width: '120px' }}></div>
        )}

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <button onClick={() => setActiveTab('home')} className={`home-tab-btn ${activeTab === 'home' ? 'active' : ''}`}>Trang Chủ</button>
          <span className="tab-separator">✦</span>
          <button onClick={() => setActiveTab('ai')} className={`home-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}>Phân Tích AI</button>
          <span className="tab-separator">✦</span>
          <button onClick={() => setActiveTab('pvp')} className={`home-tab-btn ${activeTab === 'pvp' ? 'active' : ''}`}>Đối Kháng 1v1</button>
          <span className="tab-separator">✦</span>
          <button onClick={() => setActiveTab('rank')} className={`home-tab-btn ${activeTab === 'rank' ? 'active' : ''}`}>Hệ Thống Rank</button>
        </nav>

        {/* Small Start Now Button */}
        <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end' }}>
          {activeTab !== 'home' && (
            <button 
              onClick={onPlay}
              className="btn-primary hover-scale btn-play-shine"
              style={{ 
                padding: '10px 24px', 
                fontSize: '1.1rem', 
                borderRadius: '24px', 
                fontWeight: 'bold', 
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)', 
                textTransform: 'uppercase', 
                letterSpacing: '1px', 
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Start Now
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: '1',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 3rem 3rem 3rem',
        boxSizing: 'border-box'
      }}>
        {renderShowcaseContent()}
      </main>
    </div>
  )
}
