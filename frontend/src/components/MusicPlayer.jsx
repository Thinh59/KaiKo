import { useState, useEffect, useRef } from 'react'

// Xóa Audio Tiếng Biển Cả và dùng YouTube BGM mặc định

const PLAYLISTS = [
  {
    id: 'default_bgm',
    type: 'videos',
    videos: ['s9rup0Pxd4s'],
    name: '🌊 Nhạc Nền Mặc Định',
    desc: 'Bản lofi siêu chill',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #6366f1, #a855f7)'
  },
  {
    id: 'tiktok_viral',
    type: 'videos',
    videos: ['W1_U2x6vEUE', '1y6smkh6c-0', 'Q_O2n7B41oI'],
    name: '🔥 TikTok Viral VN',
    desc: 'Nhạc viral Việt Nam hot nhất',
    color: '#fb923c',
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)'
  },
  {
    id: 'lofi_chill',
    type: 'videos',
    videos: ['jfKfPfyJRdk', '4xDzrJKXOOY', '1fueZCTYkpA'],
    name: '☕ Lofi Chill',
    desc: 'Study / Focus / Relax',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
  },
  {
    id: 'usuk_hits',
    type: 'videos',
    videos: ['iYbQ1uK1l0s', 'kJQP7kiw5Fk', 'JGwWNGJdvx8'],
    name: '🌍 USUK Hits',
    desc: 'Billboard & global top charts',
    color: '#60a5fa',
    gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
  },
  {
    id: 'nhac_hoa',
    type: 'videos',
    videos: ['wGz8p4rI_vI', 'M4X-b4y8YmE', 'B_B1a5OaF28'],
    name: '🎵 Nhạc Hoa Ngữ',
    desc: 'C-Pop trending & ballads',
    color: '#f472b6',
    gradient: 'linear-gradient(135deg, #ec4899, #be185d)'
  },
  {
    id: 'custom_list',
    type: 'videos',
    videos: ['n2edoTF6ZTQ', 'te63aHCSGdU', 'UfmL0Zcxbiw', 'a7LqkrtM2ws'],
    name: '🎤 Nhạc Có Lời',
    desc: 'Playlist tuyển chọn đặc biệt',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
  },
]

export default function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [volume, setVolume] = useState(() => {
    const v = localStorage.getItem('kaiko_bgm_volume');
    return v !== null ? parseFloat(v) * 100 : 70;
  })
  const [playerReady, setPlayerReady] = useState(false)
  const [currentSong, setCurrentSong] = useState({ title: '', author: '' })
  const [showPlaylists, setShowPlaylists] = useState(true)
  const [showAutoplayPrompt, setShowAutoplayPrompt] = useState(true)
  const playerRef = useRef(null)
  const songPollRef = useRef(null)

  // Load YouTube IFrame API + create player container OUTSIDE React tree
  useEffect(() => {
    // Create player div outside React's control to avoid DOM mismatch
    let container = document.getElementById('yt-music-player')
    if (!container) {
      container = document.createElement('div')
      container.id = 'yt-music-player'
      container.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;'
      document.body.appendChild(container)
    }

    if (window.YT && window.YT.Player) { initPlayer(); return }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => initPlayer()

    return () => {
      if (songPollRef.current) clearInterval(songPollRef.current)
    }
  }, [])

  useEffect(() => {
    const handleBgmVol = (e) => {
      const vol = e.detail;
      setVolume(vol * 100);
      if (playerRef.current && playerReady) {
        playerRef.current.setVolume(vol * 100);
      }
    };
    window.addEventListener('kaiko_bgm_volume_changed', handleBgmVol);
    return () => window.removeEventListener('kaiko_bgm_volume_changed', handleBgmVol);
  }, [playerReady]);

  const initPlayer = () => {
    if (playerRef.current) return
    try {
      playerRef.current = new window.YT.Player('yt-music-player', {
        height: '1', width: '1',
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0 },
        events: {
          onReady: (e) => {
            try { e.target.setVolume(volume) } catch(_){}
            setPlayerReady(true)
          },
          onStateChange: (e) => {
            const playing = e.data === 1
            setIsPlaying(playing)
            if (playing) {
              songPollRef.current = setInterval(() => {
                try {
                  const data = playerRef.current?.getVideoData()
                  if (data?.title) setCurrentSong({ title: data.title, author: data.author || '' })
                } catch (_) {}
              }, 2000)
            } else {
              clearInterval(songPollRef.current)
            }
          }
        }
      })
    } catch(e) {
      console.warn('YouTube player init failed:', e)
    }
  }

  const loadPlaylist = (pl) => {
    setSelectedPlaylist(pl)
    setShowPlaylists(false)
    try {
      if (playerRef.current && playerReady) {
        if (pl.type === 'videos') {
          playerRef.current.loadPlaylist({ playlist: pl.videos, index: 0, startSeconds: 0 })
        } else {
          playerRef.current.loadPlaylist({ list: pl.id, listType: 'playlist', index: 0, startSeconds: 0 })
        }
        playerRef.current.setVolume(volume)
      }
    } catch(e) { console.warn('loadPlaylist error:', e) }
  }

  const handlePlay = () => {
    try {
      if (!playerReady || !playerRef.current) return
      if (isPlaying) playerRef.current.pauseVideo()
      else playerRef.current.playVideo()
    } catch(e) {}
  }

  const handleNext = () => {
    try { if (playerRef.current && playerReady) playerRef.current.nextVideo() } catch(e) {}
  }

  const handlePrev = () => {
    try { if (playerRef.current && playerReady) playerRef.current.previousVideo() } catch(e) {}
  }

  const handleShuffle = () => {
    try { if (playerRef.current && playerReady) playerRef.current.setShuffle(true) } catch(e) {}
  }

  const handleVolume = (v) => {
    setVolume(v)
    if (playerRef.current && playerReady) playerRef.current.setVolume(v)
    localStorage.setItem('kaiko_bgm_volume', (v / 100).toString());
    window.dispatchEvent(new CustomEvent('kaiko_bgm_volume_changed', { detail: v / 100 }));
  }

  const openYouTube = () => {
    if (selectedPlaylist) {
      if (selectedPlaylist.type === 'videos') {
        window.open(`https://www.youtube.com/watch?v=${selectedPlaylist.videos[0]}`, '_blank')
      } else {
        window.open(`https://www.youtube.com/playlist?list=${selectedPlaylist.id}`, '_blank')
      }
    }
  }

  return (
    <>
      {/* Floating container */}
      {showAutoplayPrompt && !isPlaying && !isOpen && (
        <button 
          onClick={() => {
            if (!playerReady) return;
            setShowAutoplayPrompt(false);
            if (!selectedPlaylist) {
              loadPlaylist(PLAYLISTS[0]);
            } else {
              handlePlay();
            }
          }}
          disabled={!playerReady}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            borderRadius: '20px',
            padding: '12px 24px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: playerReady ? 'pointer' : 'not-allowed',
            opacity: playerReady ? 1 : 0.6,
            boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
            animation: playerReady ? 'pulseBtn 2s infinite' : 'none'
          }}
        >
          {playerReady ? '🎵 Bật Nhạc Nền' : '⏳ Đang tải nhạc...'}
        </button>
      )}

      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>

        {/* Main panel */}
        {isOpen && (
          <div style={{
            marginBottom: '12px',
            background: 'rgba(10,10,20,0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            width: '320px',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            animation: 'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>

            {/* Header */}
            <div style={{
              background: selectedPlaylist ? selectedPlaylist.gradient : 'linear-gradient(135deg, #1e1b4b, #312e81)',
              padding: '20px',
              transition: 'background 0.5s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                    🎵 KaiKo Music
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentSong.title || (selectedPlaylist ? selectedPlaylist.name : 'Chọn playlist')}
                  </div>
                  {currentSong.author && (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{currentSong.author}</div>
                  )}
                </div>
                <button
                  onClick={() => { setShowPlaylists(s => !s) }}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  {showPlaylists ? '🎵' : '📋'}
                </button>
              </div>

              {/* Visualizer */}
              {isPlaying && (
                <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '24px', marginTop: '12px' }}>
                  {[...Array(16)].map((_, i) => (
                    <div key={i} style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.6)',
                      borderRadius: '2px',
                      animation: `bar${i % 4} ${0.4 + (i % 3) * 0.15}s ease-in-out infinite alternate`
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            {!showPlaylists && selectedPlaylist && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <button onClick={handlePrev} style={ctrlBtn()}>⏮</button>
                  <button onClick={handlePlay} style={ctrlBtn(true, selectedPlaylist?.color)}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <button onClick={handleNext} style={ctrlBtn()}>⏭</button>
                  <button onClick={handleShuffle} title="Shuffle" style={{ ...ctrlBtn(), fontSize: '0.9rem' }}>🔀</button>
                  <button onClick={openYouTube} title="Mở YouTube" style={{ ...ctrlBtn(), fontSize: '0.9rem' }}>↗</button>
                </div>

                {/* Volume */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.9rem' }}>{volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}</span>
                  <input
                    type="range" min="0" max="100" value={volume}
                    onChange={e => handleVolume(Number(e.target.value))}
                    style={{ flex: 1, accentColor: selectedPlaylist?.color || '#6366f1', cursor: 'pointer', height: '4px' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '32px', textAlign: 'right' }}>{volume}%</span>
                </div>

                <button
                  onClick={() => setShowPlaylists(true)}
                  style={{ width: '100%', marginTop: '14px', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  📋 Đổi playlist
                </button>
              </div>
            )}

            {/* Playlist selector */}
            {showPlaylists && (
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '4px' }}>
                  Chọn Playlist
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {PLAYLISTS.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => loadPlaylist(pl)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderRadius: '14px', cursor: 'pointer',
                        background: selectedPlaylist?.id === pl.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selectedPlaylist?.id === pl.id ? pl.color + '60' : 'rgba(255,255,255,0.06)'}`,
                        textAlign: 'left', transition: 'all 0.2s', width: '100%'
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: pl.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                        {pl.name.split(' ')[0]}
                      </div>
                      <div>
                        <div style={{ color: '#f3f4f6', fontWeight: '600', fontSize: '0.85rem' }}>{pl.name.slice(pl.name.indexOf(' ') + 1)}</div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{pl.desc}</div>
                      </div>
                      {selectedPlaylist?.id === pl.id && isPlaying && (
                        <div style={{ marginLeft: 'auto', color: pl.color, fontSize: '0.7rem' }}>▶ Playing</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(o => !o)}
          style={{
            width: '54px', height: '54px', borderRadius: '50%',
            background: isPlaying && selectedPlaylist
              ? selectedPlaylist.gradient
              : 'rgba(15,15,25,0.9)',
            border: `2px solid ${selectedPlaylist?.color || 'rgba(99,102,241,0.4)'}`,
            color: '#fff', fontSize: '1.4rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isPlaying
              ? `0 0 24px ${selectedPlaylist?.color || '#6366f1'}80, 0 4px 20px rgba(0,0,0,0.4)`
              : '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(12px)',
            animation: isPlaying ? 'pulse 2s infinite' : 'none'
          }}
          title="Nhạc nền"
        >
          {isPlaying ? '🎵' : '🎶'}
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes bar0 { from { height: 4px; } to { height: 18px; } }
        @keyframes bar1 { from { height: 10px; } to { height: 22px; } }
        @keyframes bar2 { from { height: 6px; } to { height: 16px; } }
        @keyframes bar3 { from { height: 14px; } to { height: 8px; } }
      `}</style>
    </>
  )
}

const ctrlBtn = (isPrimary = false, color = '#6366f1') => ({
  width: isPrimary ? '48px' : '38px',
  height: isPrimary ? '48px' : '38px',
  borderRadius: '50%',
  background: isPrimary ? color : 'rgba(255,255,255,0.07)',
  border: isPrimary ? 'none' : '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: isPrimary ? '1.2rem' : '1rem',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s',
  flexShrink: 0
})
