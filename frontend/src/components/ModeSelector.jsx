import { useState } from 'react'

export default function ModeSelector({ onSelect }) {
  const [category, setCategory] = useState(null) // e.g. 'science', 'history'
  const [visibility, setVisibility] = useState(null) // 'private' | 'public'
  const [format, setFormat] = useState(null) // 'video' | 'chat'
  const [showCustomOptions, setShowCustomOptions] = useState(false)
  const [roomCodeInput, setRoomCodeInput] = useState('')

  const handleSelect = (mode) => {
    // Nếu là chat thì append tiền tố text_
    const finalMode = format === 'chat' ? (mode === 'solo_ai' ? 'text_solo' : mode === '1v1' ? 'text_1v1' : 'text_custom') : mode;
    
    if (mode === 'custom_create') {
      onSelect({ mode: format === 'chat' ? 'text_custom_create' : 'custom_create', visibility, category })
    } else if (mode === 'custom_join') {
      onSelect({ mode: format === 'chat' ? 'text_custom_join' : 'custom_join', roomCode: roomCodeInput.trim(), visibility, category })
    } else {
      onSelect({ mode: finalMode, visibility, category })
    }
  }

  const categories = [
    { id: 'random', label: 'Ngẫu nhiên', icon: '🎲' },
    { id: 'science', label: 'Khoa học', icon: '🔬' },
    { id: 'history', label: 'Lịch sử', icon: '🏛️' },
    { id: 'social', label: 'Mạng xã hội', icon: '📱' },
    { id: 'literature', label: 'Văn học', icon: '📚' },
    { id: 'math', label: 'Toán học', icon: '📐' },
    { id: 'vietnamese', label: 'Tiếng Việt', icon: '🇻🇳' },
    { id: 'philosophy', label: 'Triết học', icon: '🤔' }
  ]

  if (!category) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '900px', padding: '3rem 2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Chủ đề Tranh Biện</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Bạn muốn tranh luận về lĩnh vực nào?</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {categories.map(cat => (
              <div
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)' }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{cat.icon}</div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>{cat.label}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!visibility) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '800px', padding: '3rem 2.5rem', textAlign: 'center', position: 'relative' }}>
          <button
            onClick={() => setCategory(null)}
            style={{ position: 'absolute', top: '20px', left: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ← Quay lại
          </button>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Quyền xem trận đấu</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Bạn muốn cộng đồng có thể vào xem trận này không?</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div
              onClick={() => setVisibility('private')}
              style={{ padding: '3rem', background: 'rgba(16, 185, 129, 0.05)', border: '2px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; e.currentTarget.style.transform = 'translateY(-5px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
              <h3 style={{ fontSize: '1.8rem', color: '#10b981', marginBottom: '10px' }}>Private</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Chỉ người chơi trong phòng thấy trận đấu. Cộng đồng không xem live được.</p>
            </div>

            <div
              onClick={() => setVisibility('public')}
              style={{ padding: '3rem', background: 'rgba(239, 68, 68, 0.05)', border: '2px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.transform = 'translateY(-5px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌐</div>
              <h3 style={{ fontSize: '1.8rem', color: '#ef4444', marginBottom: '10px' }}>Public</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Cộng đồng có thể vào tab Xem Live để theo dõi transcript và reaction.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!format) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '800px', padding: '3rem 2.5rem', textAlign: 'center', position: 'relative' }}>
          <button
            onClick={() => setVisibility(null)}
            style={{ position: 'absolute', top: '20px', left: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ← Quay lại
          </button>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Hình thức Tranh Biện</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>{visibility === 'public' ? 'Public' : 'Private'} · Bạn muốn tranh biện bằng cách nào?</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div
              onClick={() => setFormat('video')}
              style={{ padding: '3rem', background: 'rgba(59, 130, 246, 0.05)', border: '2px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.transform = 'translateY(-5px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎥</div>
              <h3 style={{ fontSize: '1.8rem', color: '#3b82f6', marginBottom: '10px' }}>Video Debate</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Dùng Camera và Microphone để giao tiếp trực tiếp.</p>
            </div>

            <div
              onClick={() => setFormat('chat')}
              style={{ padding: '3rem', background: 'rgba(168, 85, 247, 0.05)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'; e.currentTarget.style.transform = 'translateY(-5px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
              <h3 style={{ fontSize: '1.8rem', color: '#a855f7', marginBottom: '10px' }}>Chat Debate</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Tranh biện bằng cách gõ phím. Có check đạo văn & AI.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '900px', padding: '3rem 2.5rem', textAlign: 'center', position: 'relative' }}>
        <button 
          onClick={() => setFormat(null)}
          style={{ position: 'absolute', top: '20px', left: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
        >
          ← Quay lại
        </button>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Chế độ chơi ({format === 'video' ? 'Video' : 'Chat'})</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Chọn chế độ để ghép cặp hoặc luyện tập</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {visibility !== 'public' && (
            <div
              onClick={() => handleSelect('solo_ai')}
              style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🤖</div>
              <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>Solo vs AI</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Luyện tập 1-1 với trợ lý ảo AI Gemini.</p>
            </div>
          )}

          <div
            onClick={() => handleSelect('1v1')}
            style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>1v1 Debate</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Ghép cặp với một người chơi khác cùng trình độ.</p>
          </div>

          <div
            style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', transition: 'all 0.3s ease', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            onMouseEnter={e => { if (!showCustomOptions) { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#ec4899'; e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)'; } }}
            onMouseLeave={e => { if (!showCustomOptions) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; } }}
          >
            {!showCustomOptions ? (
              <div onClick={() => setShowCustomOptions(true)} style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🤝</div>
                <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>Chơi Giao Hữu</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Tạo phòng hoặc nhập code để đấu với bạn bè.</p>
              </div>
            ) : (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn-primary" onClick={() => handleSelect('custom_create')} style={{ background: '#ec4899', borderColor: '#ec4899', padding: '10px', borderRadius: '8px' }}>Tạo Phòng Mới</button>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input type="text" placeholder="Nhập Code..." value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
                  <button onClick={() => setShowCustomOptions(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '8px 0' }}>Quay lại</button>
                  <button onClick={() => { if(roomCodeInput.trim()) handleSelect('custom_join') }} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Vào</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
