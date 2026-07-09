export default function TranscriptPanel({
  currentPlayer,
  playerAName,
  playerBName,
  transcriptA,
  transcriptB,
  fallaciesA,
  fallaciesB,
  liveText,
  aiSpeech
}) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '24px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📝</span> Transcript & Ngụy biện
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr', gap: '16px', flex: 1 }}>
        {/* Player A */}
        <div style={{
          border: `2px solid ${currentPlayer === 'A' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          background: currentPlayer === 'A' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h4 style={{ margin: '0 0 12px', color: currentPlayer === 'A' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize: '1.1rem' }}>{playerAName}</h4>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            marginBottom: '12px',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            minHeight: '80px'
          }}>
            {transcriptA ? (
              <p style={{ margin: 0 }}>{transcriptA}</p>
            ) : (
              <i style={{ color: 'var(--text-secondary)' }}>Chờ lời phát biểu...</i>
            )}
            {currentPlayer === 'A' && liveText && (
              <p style={{ margin: '8px 0 0', color: 'var(--accent-primary)', fontStyle: 'italic', fontWeight: 500, borderTop: '1px solid rgba(99,102,241,0.3)', paddingTop: '8px' }}>
                🎤 {liveText}
              </p>
            )}
          </div>

          <div style={{ fontSize: '0.9rem' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Ngụy biện:</strong>
            {fallaciesA.length > 0 ? (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {fallaciesA.map((f, i) => (
                  <span key={i} style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: '4px 0 0', color: '#10b981' }}>Không phát hiện ngụy biện</p>
            )}
          </div>
        </div>

        {/* Player B */}
        <div style={{
          border: `2px solid ${currentPlayer === 'B' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          background: currentPlayer === 'B' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h4 style={{ margin: '0 0 12px', color: currentPlayer === 'B' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize: '1.1rem' }}>{playerBName}</h4>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            marginBottom: '12px',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            minHeight: '80px'
          }}>
            {transcriptB ? (
              <p style={{ margin: 0 }}>{transcriptB}</p>
            ) : (
              <i style={{ color: 'var(--text-secondary)' }}>Chờ lời phát biểu...</i>
            )}
            {aiSpeech && currentPlayer === 'B' && (
              <p style={{ margin: '8px 0 0', color: '#7c3aed', fontStyle: 'italic', fontWeight: 500, borderTop: '1px solid rgba(168,85,247,0.3)', paddingTop: '8px' }}>
                🤖 AI: {aiSpeech}
              </p>
            )}
          </div>

          <div style={{ fontSize: '0.9rem' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Ngụy biện:</strong>
            {fallaciesB.length > 0 ? (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {fallaciesB.map((f, i) => (
                  <span key={i} style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: '4px 0 0', color: '#10b981' }}>Không phát hiện ngụy biện</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
