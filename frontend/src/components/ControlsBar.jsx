export default function ControlsBar({
  timeLeft,
  isRunning,
  currentPlayer,
  playerAName,
  playerBName,
  isScoring,
  isAiThinking,
  onStart,
  onStop,
  onNextTurn,
  onEnd,
  onCancel
}) {
  const isTimeRunningOut = timeLeft <= 10
  const isDisabled = isScoring || isAiThinking

  return (
    <div style={{
      textAlign: 'center',
      transition: 'all 0.3s ease',
      padding: '1.25rem',
      background: 'rgba(15, 23, 42, 0.9)',   // nền tối CỐ ĐỊNH -> đọc rõ ở cả bright/dark mode
      border: '1px solid rgba(56,189,248,0.3)',
      borderRadius: 'var(--radius-lg, 20px)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {/* Timer Panel */}
      <div style={{
        background: 'rgba(0,0,0,0.35)',
        border: `2px solid ${isTimeRunningOut ? 'rgba(255,75,75,0.55)' : 'rgba(56,189,248,0.45)'}`,
        borderRadius: '16px',
        padding: '0.6rem 1rem 0.8rem',
        marginBottom: '1.25rem',
        boxShadow: isTimeRunningOut
          ? '0 0 24px rgba(255,75,75,0.35), inset 0 0 18px rgba(255,75,75,0.15)'
          : '0 0 20px rgba(56,189,248,0.22), inset 0 0 18px rgba(56,189,248,0.10)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          fontSize: '0.72rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#7dd3fc',
          marginBottom: '2px'
        }}>
          ⏱️ Thời gian lượt
        </div>
        <div style={{
          fontSize: '4.5rem',
          fontWeight: '800',
          color: isTimeRunningOut ? '#ff4b4b' : '#38bdf8',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '4px',
          lineHeight: 1.05,
          textShadow: isTimeRunningOut ? '0 0 25px rgba(255,75,75,0.6)' : '0 0 20px rgba(56,189,248,0.4)',
          transition: 'color 0.3s ease, text-shadow 0.3s ease'
        }}>
          {String(timeLeft).padStart(2, '0')}<span style={{ fontSize: '2rem', opacity: 0.7, marginLeft: '4px' }}>s</span>
        </div>
      </div>

      {/* Current Turn Display */}
      <div style={{
        fontSize: '1.2rem',
        marginBottom: '2rem',
        color: '#cbd5e1',
        background: isAiThinking ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.08)',
        padding: '10px 20px',
        borderRadius: 'var(--radius-full)',
        display: 'inline-block',
        border: isAiThinking ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent',
        transition: 'all 0.3s ease'
      }}>
        {isAiThinking ? '🤖 AI đang phát biểu...' : (
          <>Đang nói: <strong style={{ color: 'white', fontSize: '1.3rem', marginLeft: '8px' }}>
            {currentPlayer === 'A' ? playerAName : playerBName}
          </strong></>
        )}
      </div>

      {/* Control Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginBottom: '1rem'
      }}>
        {(!isRunning && !isAiThinking) ? (
          <button
            onClick={onStart}
            disabled={isDisabled}
            className="btn-primary"
            style={{ padding: '12px 24px', borderRadius: 'var(--radius-full)', opacity: isDisabled ? 0.5 : 1 }}
          >
            ▶️ {timeLeft === 90 ? 'Bắt đầu' : 'Tiếp tục'}
          </button>
        ) : isAiThinking ? (
          <button disabled style={{
            padding: '12px 24px', background: 'rgba(168,85,247,0.2)', color: '#a855f7',
            border: '1px solid rgba(168,85,247,0.5)', borderRadius: 'var(--radius-full)',
            cursor: 'not-allowed', fontSize: '1.1rem', fontWeight: '600'
          }}>
            🤖 AI đang nói...
          </button>
        ) : (
          <button
            onClick={onStop}
            style={{
              padding: '12px 24px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.3)')}
            onMouseLeave={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.2)')}
          >
            ⏸️ Tạm dừng
          </button>
        )}

        <button
          onClick={onNextTurn}
          disabled={isDisabled}
          style={{
            padding: '12px 24px',
            background: isDisabled ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255, 0.1)',
            color: isDisabled ? 'var(--text-secondary)' : 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 'var(--radius-full)',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontSize: '1.1rem',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => !isDisabled && (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => !isDisabled && (e.target.style.background = 'rgba(255, 255, 255, 0.1)')}
        >
          ⏭️ Chuyển lượt
        </button>

        <button
          onClick={onEnd}
          disabled={isDisabled}
          style={{
            padding: '12px 24px',
            background: isDisabled ? 'rgba(255,255,255,0.1)' : 'var(--accent-gradient)',
            color: isDisabled ? 'var(--text-secondary)' : 'white',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontSize: '1.1rem',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            boxShadow: isDisabled ? 'none' : 'var(--shadow-glow)'
          }}
          onMouseEnter={(e) => !isDisabled && (e.target.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => !isDisabled && (e.target.style.transform = 'translateY(0)')}
        >
          {isScoring ? '⏳ Đang chấm điểm...' : '✅ Kết thúc'}
        </button>

        <button
          onClick={onCancel}
          style={{
            padding: '12px 24px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          title="Thoát"
          onMouseEnter={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.4)')}
          onMouseLeave={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.2)')}
        >
          🚪 Thoát
        </button>
      </div>

      {/* Timer Warning */}
      <div style={{ height: '24px', transition: 'opacity 0.3s ease', opacity: isTimeRunningOut && isRunning ? 1 : 0 }}>
        <p style={{ color: '#ef4444', margin: 0, fontSize: '1.1rem', fontWeight: 'bold', animation: 'fadeIn 0.5s infinite alternate' }}>
          ⏰ Sắp hết giờ!
        </p>
      </div>
    </div>
  )
}
