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
  onEnd
}) {
  const isTimeRunningOut = timeLeft <= 10
  const isDisabled = isScoring || isAiThinking

  return (
    <div className="glass-panel" style={{
      padding: '2rem',
      textAlign: 'center',
      borderTop: '4px solid',
      borderTopColor: isTimeRunningOut ? '#ef4444' : 'var(--accent-primary)',
      transition: 'all 0.3s ease',
      boxShadow: isTimeRunningOut ? '0 -10px 20px rgba(239,68,68,0.2)' : 'var(--shadow-md)'
    }}>
      {/* Timer */}
      <div style={{
        fontSize: '5rem',
        fontWeight: '800',
        color: isTimeRunningOut ? '#ef4444' : 'var(--accent-primary)',
        marginBottom: '1rem',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '4px',
        textShadow: isTimeRunningOut ? '0 0 25px rgba(239,68,68,0.6)' : '0 0 20px rgba(99,102,241,0.4)',
        transition: 'color 0.3s ease, text-shadow 0.3s ease'
      }}>
        {String(timeLeft).padStart(2, '0')}<span style={{ fontSize: '2rem', opacity: 0.7, marginLeft: '4px' }}>s</span>
      </div>

      {/* Current Turn Display */}
      <div style={{
        fontSize: '1.2rem',
        marginBottom: '2rem',
        color: 'var(--text-secondary)',
        background: isAiThinking ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.05)',
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
