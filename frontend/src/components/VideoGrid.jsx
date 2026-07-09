import { useEffect, useRef } from 'react'
import Avatar from './Avatar'

// CSS animation injected once
const PULSE_STYLE = `
@keyframes aiPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.7), 0 0 0 4px rgba(168,85,247,0.3); }
  50%       { box-shadow: 0 0 0 12px rgba(168,85,247,0), 0 0 0 20px rgba(168,85,247,0); }
}
@keyframes micPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.7); }
  50%       { box-shadow: 0 0 0 10px rgba(99,102,241,0); }
}
`

export default function VideoGrid({
  remoteVideoRef,
  localVideoRef,
  localStream,
  remoteStream,
  connected,
  iceState,
  isSolo,
  remoteName,
  localName,
  isCameraOn,
  onToggleCamera,
  isMicOn,
  onToggleMic,
  isAiSpeaking,
  isUserSpeaking   // pass true when isRunning && currentPlayer==='A'
}) {
  // Trạng thái kết nối hiển thị cho người dùng (chỉ khi 1v1, chưa có video đối phương)
  const connLabel = (() => {
    if (isSolo || remoteStream) return null
    if (iceState === 'failed') return '⚠️ Kết nối thất bại — cần TURN server (2 máy khác mạng)'
    if (iceState === 'disconnected') return '⚠️ Mất kết nối, đang thử lại…'
    if (connected) return null
    if (iceState === 'checking' || iceState === 'new') return '🔄 Đang kết nối tới đối phương…'
    return null
  })()
  // Inject animation styles once
  const styleInjected = useRef(false)
  useEffect(() => {
    if (styleInjected.current) return
    const el = document.createElement('style')
    el.textContent = PULSE_STYLE
    document.head.appendChild(el)
    styleInjected.current = true
  }, [])

  // Sync streams to video elements
  useEffect(() => {
    if (localVideoRef && localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, localVideoRef])

  useEffect(() => {
    if (remoteVideoRef && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, remoteVideoRef])

  return (
    <div className="glass-panel" style={{
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      aspectRatio: '16/9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginBottom: '24px',
      border: isAiSpeaking
        ? '2px solid rgba(168,85,247,0.6)'
        : '1px solid var(--border-light)',
      boxShadow: isAiSpeaking
        ? '0 0 30px rgba(168,85,247,0.25), var(--shadow-lg)'
        : 'var(--shadow-lg)',
      transition: 'border-color 0.4s ease, box-shadow 0.4s ease'
    }}>

      {/* ── Remote / AI area (large) ── */}
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        position: 'relative'
      }}>
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-in' }}>
            {/* AI speaking: pulsing purple ring around avatar */}
            <div style={{
              display: 'inline-block',
              borderRadius: '50%',
              animation: isAiSpeaking ? 'aiPulse 1.2s ease-in-out infinite' : 'none',
              padding: '4px'
            }}>
              <Avatar name={remoteName || 'Opponent'} seed={remoteName} size={120} />
            </div>
            <p style={{
              color: isAiSpeaking ? '#a855f7' : 'var(--text-secondary)',
              marginTop: '16px',
              fontSize: '1.1rem',
              fontWeight: isAiSpeaking ? '600' : 'normal',
              transition: 'color 0.3s ease'
            }}>
              {isAiSpeaking ? '🔊 Đang phát biểu...' : (remoteName || 'Chờ đối phương...')}
            </p>
            {connLabel && (
              <p style={{
                color: iceState === 'failed' ? '#f87171' : '#7dd3fc',
                marginTop: '8px',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                {connLabel}
              </p>
            )}
          </div>
        )}

        {/* AI speaking overlay indicator */}
        {isAiSpeaking && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(168,85,247,0.15)',
            border: '1px solid rgba(168,85,247,0.5)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 14px',
            color: '#a855f7',
            fontSize: '0.9rem',
            fontWeight: '600',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ animation: 'aiPulse 1s infinite', display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} />
            AI Gemini đang nói
          </div>
        )}
      </div>

      {/* ── Local video (bottom-right corner) ── */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        width: '180px',
        height: '180px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: '#1a1d27',
        border: isUserSpeaking
          ? '2px solid rgba(99,102,241,0.8)'
          : '2px solid rgba(255,255,255,0.2)',
        boxShadow: isUserSpeaking
          ? '0 0 16px rgba(99,102,241,0.5)'
          : '0 8px 16px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        flexShrink: 0,
        position: 'absolute'
      }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: isCameraOn ? 'block' : 'none'
          }}
        />
        {!isCameraOn && (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0f1117'
          }}>
            <Avatar name={localName || 'You'} seed={localName} size={64} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px', textAlign: 'center' }}>
              Camera tắt
            </p>
          </div>
        )}

        {/* Mic indicator dot */}
        <div style={{
          position: 'absolute', bottom: '8px', left: '8px',
          width: '10px', height: '10px', borderRadius: '50%',
          background: isMicOn ? '#10b981' : '#ef4444',
          boxShadow: isMicOn && isUserSpeaking
            ? '0 0 0 0 rgba(16,185,129,0.7)'
            : 'none',
          animation: isMicOn && isUserSpeaking ? 'micPulse 1s ease-in-out infinite' : 'none',
          transition: 'background 0.3s ease'
        }} />

        {/* Name label */}
        <div style={{
          position: 'absolute', bottom: '6px', right: '8px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 8px',
          fontSize: '0.75rem',
          color: 'white',
          backdropFilter: 'blur(4px)'
        }}>
          {localName || 'Bạn'}
        </div>
      </div>

      {/* ── Media Controls ── */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        display: 'flex',
        gap: '10px'
      }}>
        {/* Mic toggle */}
        <button
          onClick={onToggleMic}
          title={isMicOn ? 'Tắt mic' : 'Bật mic'}
          style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            background: isMicOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.85)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            fontSize: '1.3rem',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isMicOn ? '🎙️' : '🔇'}
        </button>

        {/* Camera toggle */}
        <button
          onClick={onToggleCamera}
          title={isCameraOn ? 'Tắt camera' : 'Bật camera'}
          style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            background: isCameraOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.85)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            fontSize: '1.3rem',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isCameraOn ? '📹' : '📷'}
        </button>
      </div>
    </div>
  )
}
