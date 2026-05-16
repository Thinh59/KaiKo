export default function RoomWaiting({ onCancel, roomError, createdRoomCode, mode }) {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {roomError ? (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>Lỗi!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '3rem' }}>{roomError}</p>
          </>
        ) : createdRoomCode ? (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤝</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Phòng Đã Tạo!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1rem' }}>
              Hãy gửi mã code này cho bạn bè để họ nhập vào.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '20px 40px', borderRadius: '16px', border: '2px dashed var(--accent-primary)', fontSize: '3rem', fontWeight: 'bold', letterSpacing: '10px', color: '#fff', marginBottom: '3rem' }}>
              {createdRoomCode}
            </div>
            <p style={{ color: 'var(--accent-primary)', fontSize: '1rem', marginBottom: '2rem', animation: 'pulse 2s infinite' }}>Đang chờ người chơi vào...</p>
          </>
        ) : (
          <>
            <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '2rem' }}>
              <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(99, 102, 241, 0.2)', borderRadius: '50%' }}></div>
              <div style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🔍</div>
            </div>

            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              {mode === 'custom_join' ? 'Đang vào phòng...' : 'Đang tìm đối thủ...'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              {mode === 'custom_join' ? 'Đang kết nối tới phòng của bạn bè.' : 'Hệ thống đang ghép cặp bạn với người chơi khác. Vui lòng chờ trong giây lát.'}
            </p>
          </>
        )}

        <button
          onClick={onCancel}
          className="btn-secondary"
          style={{ padding: '12px 32px', borderRadius: 'var(--radius-full)' }}
        >
          {roomError ? 'Quay lại' : 'Hủy'}
        </button>

      </div>
    </div>
  )
}
