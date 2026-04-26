import { useState } from 'react'

export default function HomePage({ onStart }) {
  const [topic, setTopic] = useState('')
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')

  const handleStart = () => {
    if (!topic || !playerA || !playerB) {
      alert('Vui lòng điền đầy đủ thông tin')
      return
    }
    onStart({ topic, playerA, playerB })
  }

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '3rem 2.5rem',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>KaiKo</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Nền tảng Tranh biện AI Đỉnh cao</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Chủ đề tranh biện</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="VD: Học đại học có còn cần thiết không?"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Người chơi A (Ủng hộ)</label>
            <input
              value={playerA}
              onChange={e => setPlayerA(e.target.value)}
              placeholder="Nhập tên người chơi A..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Người chơi B (Phản đối)</label>
            <input
              value={playerB}
              onChange={e => setPlayerB(e.target.value)}
              placeholder="Nhập tên người chơi B..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={handleStart}
            className="btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '16px' }}
          >
            Bắt đầu Tranh biện 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
