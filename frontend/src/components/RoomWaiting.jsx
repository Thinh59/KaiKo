export default function RoomWaiting({ onCancel }) {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '2rem' }}>
          <div style={{
            position: 'absolute', inset: 0,
            border: '4px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '50%',
          }}></div>
          <div style={{
            position: 'absolute', inset: 0,
            border: '4px solid transparent',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '3rem'
          }}>
            🔍
          </div>
        </div>

        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Đang tìm đối thủ...
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '3rem' }}>
          Hệ thống đang ghép cặp bạn với người chơi khác. Vui lòng chờ trong giây lát.
        </p>

        <button
          onClick={onCancel}
          className="btn-secondary"
          style={{ padding: '12px 32px', borderRadius: 'var(--radius-full)' }}
        >
          Hủy tìm kiếm
        </button>

      </div>
    </div>
  )
}
