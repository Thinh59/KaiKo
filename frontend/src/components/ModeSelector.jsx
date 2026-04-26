import { useState } from 'react'

export default function ModeSelector({ onSelect }) {

  const handleSelect = (mode) => {
    onSelect({ mode })
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '900px', padding: '3rem 2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Chế độ chơi</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>Chọn chế độ để ghép cặp hoặc luyện tập</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Solo AI Mode */}
          <div
            onClick={() => handleSelect('solo_ai')}
            style={{
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🤖</div>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>Solo vs AI</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Luyện tập debate 1-1 với trợ lý ảo AI Gemini.
            </p>
          </div>

          {/* 1v1 Mode */}
          <div
            onClick={() => handleSelect('1v1')}
            style={{
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>1v1 Debate</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Ghép cặp ngẫu nhiên với một người chơi khác.
            </p>
          </div>

          {/* 2v2 Mode */}
          <div
            onClick={() => handleSelect('2v2')}
            style={{
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🤝</div>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>2v2 Team</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Đấu đội 2 người (Đang cập nhật...).
            </p>
          </div>

        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', opacity: 0.7 }}>
          💡 Chọn chế độ để bắt đầu. Hệ thống sẽ tự động tìm đối thủ và chọn chủ đề tranh biện.
        </p>
      </div>
    </div>
  )
}
