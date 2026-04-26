import { useState, useEffect } from 'react'

export default function FallacyAlert({ fallacy, speaker }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (fallacy) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [fallacy])

  if (!visible || !fallacy) return null

  return (
    <div className="glass-panel animate-fade-in" style={{
      position: 'fixed', bottom: '24px', right: '24px',
      background: 'rgba(239, 68, 68, 0.9)', color: 'white',
      padding: '16px 24px', borderRadius: 'var(--radius-lg)',
      boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.5)',
      maxWidth: '350px', zIndex: 1000,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
        <span>⚠️</span> Phát hiện ngụy biện!
      </strong>
      <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9 }}>
        <strong style={{ color: '#fca5a5' }}>{speaker}:</strong> <em>{fallacy}</em>
      </p>
    </div>
  )
}
