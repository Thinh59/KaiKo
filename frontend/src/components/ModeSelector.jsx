import { useState } from 'react'

export default function ModeSelector({ onSelect }) {
  const [category, setCategory] = useState(null) // e.g. 'science', 'history'
  const [visibility, setVisibility] = useState(null) // 'private' | 'public'
  const [format, setFormat] = useState(null) // 'video' | 'chat'
  const [joinMode, setJoinMode] = useState(false) // đang ở màn "vào phòng bằng code"
  const [roomCodeInput, setRoomCodeInput] = useState('')

  const handleSelect = (mode) => {
    // Nếu là chat thì append tiền tố text_
    const finalMode = format === 'chat' ? (mode === 'solo_ai' ? 'text_solo' : mode === '1v1' ? 'text_1v1' : 'text_custom') : mode;

    if (mode === 'custom_create') {
      onSelect({ mode: format === 'chat' ? 'text_custom_create' : 'custom_create', visibility, category })
    } else {
      onSelect({ mode: finalMode, visibility, category })
    }
  }

  // Vào phòng bằng code: guest KHÔNG chọn chủ đề/hình thức — kế thừa từ phòng host
  const handleJoinByCode = () => {
    const code = roomCodeInput.trim()
    if (code) onSelect({ mode: 'join_by_code', roomCode: code })
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

  // ── Màn "Vào phòng bằng code" (tách riêng, không cần chọn chủ đề) ──────────
  if (joinMode) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '3rem 2.5rem', textAlign: 'center', position: 'relative' }}>
          <button
            onClick={() => setJoinMode(false)}
            style={{ position: 'absolute', top: '20px', left: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ← Quay lại
          </button>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚪</div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Vào phòng bằng Code</h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
            Nhập mã phòng bạn bè chia sẻ. Bạn sẽ <strong>tự động dùng chủ đề và hình thức</strong> (video/chat) của phòng đó.
          </p>
          <input
            type="text"
            placeholder="Nhập Code phòng..."
            value={roomCodeInput}
            onChange={e => setRoomCodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleJoinByCode() }}
            style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', textAlign: 'center', fontSize: '1.3rem', letterSpacing: '3px', marginBottom: '1.2rem', boxSizing: 'border-box' }}
          />
          <button
            onClick={handleJoinByCode}
            disabled={!roomCodeInput.trim()}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', opacity: roomCodeInput.trim() ? 1 : 0.5, cursor: roomCodeInput.trim() ? 'pointer' : 'not-allowed' }}
          >
            Vào phòng
          </button>
        </div>
      </div>
    )
  }

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

          {/* Vào phòng bạn bè bằng code — không cần chọn chủ đề */}
          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Đã có mã phòng của bạn bè?</p>
            <button
              onClick={() => setJoinMode(true)}
              style={{ padding: '12px 28px', borderRadius: 'var(--radius-full)', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.5)', cursor: 'pointer', fontSize: '1.05rem', fontWeight: '600' }}
            >
              🚪 Vào phòng bằng code
            </button>
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
            onClick={() => handleSelect('custom_create')}
            style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', transition: 'all 0.3s ease', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#ec4899'; e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🤝</div>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>Tạo Phòng Giao Hữu</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Tạo phòng với chủ đề &amp; hình thức bạn đã chọn, rồi chia sẻ code cho bạn bè.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
