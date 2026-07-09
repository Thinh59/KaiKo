import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useUser, useAuth, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import HomePage from './components/HomePage'
import AuthPage, { AuthPageWithClerk } from './components/AuthPage'
import Dashboard from './components/Dashboard'
import ModeSelector from './components/ModeSelector'
import RoomWaiting from './components/RoomWaiting'
import ReadyCheck from './components/ReadyCheck'
import DebateRoom from './components/DebateRoom'
import Scoreboard from './components/Scoreboard'
import MusicPlayer from './components/MusicPlayer'
import TextDebateRoom from './components/TextDebateRoom'
import { useSignaling } from './hooks/useSignaling'

const DIALOGUES = [
  "Kani Kani cua ngon lắm nha ~~",
  "Ông Chủ Cua có chương trình giảm giá siêu hời tại shop!!!",
  "Ngang như cua thì mau mau nâng cấp...",
  "MSSV của bạn sẽ tỏa sáng trên KaiKo aaaa",
  "(◕‿◕✿) Cố lên nhé!",
  "KaiKo siêu cấp vô địch! 🦀",
  "Tranh luận vui vẻ, không quạu nha! ╰(▔∀▔)╯",
];

const initSfxVol = parseFloat(localStorage.getItem('kaiko_sfx_volume') || '0.7');
const mascotSound = new Audio('https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3');
mascotSound.volume = initSfxVol * 0.5;

const clickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
clickSound.volume = initSfxVol * 0.2;

const ANIMATIONS = [
  'floatMascotTopRight',
  'flyAcrossScreen',
  'bounceAround'
];

function InteractiveMascot({ username }) {
  const [dialogue, setDialogue] = useState(DIALOGUES[0]);
  const [showBubble, setShowBubble] = useState(false); // Ẩn mặc định
  const [isInvisible, setIsInvisible] = useState(false);
  
  // Drag state
  const [pos, setPos] = useState({ x: window.innerWidth - 120 - 80, y: 140 }); // Initial approx top right
  const [isDragging, setIsDragging] = useState(false);
  const relRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      // Keep within bounds
      setPos(prev => ({
        x: Math.min(Math.max(0, prev.x), window.innerWidth - 80),
        y: Math.min(Math.max(0, prev.y), window.innerHeight - 80)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!username || username.startsWith('Guest_')) return;
    const checkInvis = async () => {
      try {
        const res = await axios.get(`${API_BASE}/my-items/${encodeURIComponent(username)}`);
        if (res.data.success && res.data.items.includes('mascot_invis')) {
          setIsInvisible(true);
        }
      } catch (e) {}
    };
    checkInvis();
    // Check periodically in case they just bought it
    const interval = setInterval(checkInvis, 30000);
    return () => clearInterval(interval);
  }, [username]);

  // Tự động biến mất sau 5s
  useEffect(() => {
    let hideTimer;
    if (showBubble) {
      hideTimer = setTimeout(() => {
        setShowBubble(false);
      }, 5000);
    }
    return () => clearTimeout(hideTimer);
  }, [showBubble, dialogue]);

  // Lâu lâu tự hiện thoại (ngẫu nhiên 10 - 20s)
  useEffect(() => {
    let randomTimer;
    const triggerRandomTalk = () => {
      const nextDelay = Math.random() * 10000 + 10000; // 10s -> 20s
      randomTimer = setTimeout(() => {
        if (!showBubble) {
          setDialogue(DIALOGUES[Math.floor(Math.random() * DIALOGUES.length)]);
          setShowBubble(true);
        }
        triggerRandomTalk(); // loop
      }, nextDelay);
    };
    triggerRandomTalk();
    return () => clearTimeout(randomTimer);
  }, []);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    e.target.setPointerCapture(e.pointerId);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    relRef.current = {
      x: clientX - pos.x,
      y: clientY - pos.y
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    hasMovedRef.current = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    setPos({
      x: clientX - relRef.current.x,
      y: clientY - relRef.current.y
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleClick = (e) => {
    if (hasMovedRef.current) return;
    // Ẩn bubble khi ấn vào
    setShowBubble(false);
    mascotSound.currentTime = 0;
    mascotSound.play().catch(e => {});
    // Kích hoạt event mở Assistant
    document.dispatchEvent(new CustomEvent('kaiko_open_assistant'));
  };

  return (
    <div 
      className={`floating-mascot-interactive draggableMascotAnim`} 
      style={{ left: pos.x, top: pos.y, cursor: isDragging ? 'grabbing' : 'pointer', userSelect: 'none', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
    >
      {showBubble && (
        <div className="mascot-bubble mascot-bubble-interactive">
          {dialogue}
        </div>
      )}
      <img 
        src="/assets/mascots/mascot.png" 
        alt="Mascot" 
        draggable="false"
        style={{ width: '80px', height: '80px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))', cursor: 'pointer', opacity: isInvisible ? 0.15 : 1, transition: 'opacity 0.3s' }} 
        onError={e => { e.target.style.display='none'; }} 
      />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', minHeight: '100vh' }}>
          <h2>Hệ thống gặp lỗi (Crash)!</h2>
          <pre style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
          </pre>
          <p>Hãy copy lỗi này gửi cho AI để fix nhé!</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px', marginTop: '10px' }}>Tải lại trang</button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { API_BASE } from './config'

export function AppWithClerk() {
  const { isSignedIn, user } = useUser()
  const { signOut } = useAuth()

  return (
    <App
      clerkEnabled
      clerkSession={{ isSignedIn, user, signOut }}
    />
  )
}

function App({ clerkEnabled = false, clerkSession = {} }) {
  const [page, setPage] = useState('home')
  const [username, setUsername] = useState('')
  const [debateResult, setDebateResult] = useState(null)
  const [mode, setMode] = useState(null) // '1v1' | 'solo_ai' | '2v2'
  const [soloTopic, setSoloTopic] = useState('AI có thay thế được con người?')
  const [globalNicknames, setGlobalNicknames] = useState({})
  const [theme, setTheme] = useState(() => localStorage.getItem('kaiko_theme') || 'dark')

  useEffect(() => {
    const playClick = () => {
      clickSound.currentTime = 0;
      clickSound.play().catch(e => {});
    };
    document.addEventListener('click', playClick);
    
    const handleSfxVol = (e) => {
      const vol = e.detail;
      clickSound.volume = vol * 0.2;
      mascotSound.volume = vol * 0.5;
    };
    window.addEventListener('kaiko_sfx_volume_changed', handleSfxVol);
    
    return () => {
      document.removeEventListener('click', playClick);
      window.removeEventListener('kaiko_sfx_volume_changed', handleSfxVol);
    };
  }, []);

  useEffect(() => {
    if (theme === 'bright') {
      document.body.classList.add('bright-mode')
    } else {
      document.body.classList.remove('bright-mode')
    }
    localStorage.setItem('kaiko_theme', theme)
  }, [theme])

  useEffect(() => {
    axios.get(`${API_BASE}/nicknames`)
      .then(res => { if (res.data.success) setGlobalNicknames(res.data.nicknames) })
      .catch(() => {})
  }, [])
  
  const getDisplayName = (u) => globalNicknames[u] || u

  const [selfReady, setSelfReady] = useState(false)
  const [oppReady, setOppReady] = useState(false)

  // Signaling Hook
  const { matchInfo, findMatch, createRoom, joinRoom, roomError, createdRoomCode, cancelMatch, registerHandler, sendMessage } = useSignaling(username)

  // 1. Chuyển từ waiting -> ready_check
  useEffect(() => {
    if (matchInfo && page === 'waiting') {
      // Đồng bộ hình thức (video/chat) theo phòng — quan trọng cho guest vào bằng code
      if (matchInfo.format) {
        setMode(matchInfo.format === 'chat' ? 'text_1v1' : '1v1')
      }
      setPage('ready_check')
      setSelfReady(false)
      setOppReady(false)
    }
  }, [matchInfo, page])

  // 2. Lắng nghe phản hồi từ đối thủ trong Ready Check
  useEffect(() => {
    const cleanupReady = registerHandler('player_ready', () => {
      setOppReady(true)
    })
    const cleanupDecline = registerHandler('player_declined', (data) => {
      if (data?.reason === 'left' || data?.reason === 'disconnect') {
        alert("Đối thủ đã rời khỏi phòng tranh biện.")
      } else {
        alert("Đối thủ đã từ chối trận đấu, hoặc đang bận (AFK)!")
      }
      cancelMatch()
      setPage('mode')
    })
    return () => {
      cleanupReady?.()
      cleanupDecline?.()
    }
  }, [registerHandler, cancelMatch])

  // 3. Nếu cả 2 cùng ready, vào phòng Debate
  useEffect(() => {
    if (selfReady && oppReady && page === 'ready_check') {
      setPage(mode?.startsWith('text_') ? 'text_debate' : 'debate')
    }
  }, [selfReady, oppReady, page, mode])

  const {
    isSignedIn = false,
    user = null,
    signOut = async () => {}
  } = clerkSession

  const handleLogin = React.useCallback((name) => {
    setUsername(name)
    setPage('dashboard')
  }, [])

  // Tự động đăng nhập khi Clerk báo đã sign in
  useEffect(() => {
    if (isSignedIn && user && (page === 'auth' || page === 'home')) {
      const name = user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || user.firstName || 'Player'
      handleLogin(name)
    }
  }, [isSignedIn, user, page, handleLogin])

  const handlePlayNowClick = () => {
    if (isSignedIn && username) {
      setPage('dashboard')
    } else {
      setPage('auth')
    }
  }

  const handleLogout = async () => {
    await signOut()
    setUsername('')
    setPage('auth')
  }

  const handleModeSelect = async (info) => {
    setMode(info.mode)
    if (info.mode === 'solo_ai' || info.mode === 'text_solo') {
      try {
        const url = info.category ? `${API_BASE}/random-topic?category=${info.category}` : `${API_BASE}/random-topic`
        const res = await axios.get(url)
        if (res.data.success) setSoloTopic(res.data.topic)
      } catch(e) {
        console.warn("Failed to fetch random topic", e)
      }
      setPage(info.mode === 'text_solo' ? 'text_debate' : 'debate')
    } else if (info.mode === 'custom_create' || info.mode === 'text_custom_create') {
      const fmt = info.mode.startsWith('text_') ? 'chat' : 'video'
      setPage('waiting')
      createRoom(info.visibility || 'private', info.category, fmt)
    } else if (info.mode === 'join_by_code') {
      // Guest chỉ cần code — chủ đề/hình thức sẽ kế thừa từ phòng của host
      setPage('waiting')
      joinRoom(info.roomCode)
    } else {
      setPage('waiting')
      const localNick = localStorage.getItem('kaiko_nickname_' + username)
      findMatch(info.mode, localNick && localNick.trim() ? localNick.trim() : username, 1, info.visibility || 'private')
    }
  }

  const handleRoomCancel = () => {
    cancelMatch()
    setPage('mode')
  }

  const handleDebateFinish = async (result) => {
    setDebateResult(result)
    setPage('score')

    // Tự động lưu lịch sử (nếu đã đăng nhập, không phải Guest)
    if (username && !username.startsWith('Guest_')) {
      try {
        const scores = result.scores
        const winner  = scores?.winner ?? ''

        // Xác định user hiện tại là Player A hay B
        // rawUsernameA/B có dạng "{username}_{random}" — so sánh bằng startsWith
        const iAmA = (result.rawUsernameA || '').startsWith(username + '_')
                  || result.rawUsernameA === username
                  || mode === 'solo_ai'
                  || mode === 'text_solo'

        // Điểm và fallacy theo góc nhìn của user hiện tại
        const selfScore   = iAmA ? (scores?.player_a?.total  ?? 0) : (scores?.player_b?.total  ?? 0)
        const oppScore    = iAmA ? (scores?.player_b?.total  ?? 0) : (scores?.player_a?.total  ?? 0)
        const selfFallacy = iAmA ? (scores?.player_a?.deduct ?? 0) : (scores?.player_b?.deduct ?? 0)
        const oppFallacy  = iAmA ? (scores?.player_b?.deduct ?? 0) : (scores?.player_a?.deduct ?? 0)
        const transcSelf  = iAmA ? (result.transcript_a ?? '') : (result.transcript_b ?? '')
        const transcOpp   = iAmA ? (result.transcript_b ?? '') : (result.transcript_a ?? '')
        const fallaciesSelfList = iAmA ? (result.fallacies_a ?? []) : (result.fallacies_b ?? [])
        const fallaciesOppList  = iAmA ? (result.fallacies_b ?? []) : (result.fallacies_a ?? [])

        // Tên đối thủ (display name)
        const oppDisplayName = iAmA ? result.playerB : result.playerA

        // Kết quả từ góc nhìn user hiện tại
        const selfPlayerName = iAmA ? result.playerA : result.playerB
        const oppPlayerName  = iAmA ? result.playerB : result.playerA
        const resultStr = winner === selfPlayerName ? 'win'
          : winner === oppPlayerName ? 'lose' : 'draw'

        // Retrieve visibility from current mode
        const visibility = (mode === 'solo_ai' || mode === 'text_solo') ? 'private' : (matchInfo?.visibility || 'private');

        const saveRes = await axios.post(`${API_BASE}/save-match`, {
          username:        username,        // luôn dùng username từ App state
          opponent:        oppDisplayName,
          topic:           result.topic ?? '',
          mode:            mode ?? 'solo_ai',
          result:          resultStr,
          score_self:      selfScore,
          score_opp:       oppScore,
          fallacies_self:  selfFallacy,
          fallacies_opp:   oppFallacy,
          fallacies_list_self: fallaciesSelfList,
          fallacies_list_opp:  fallaciesOppList,
          summary:         scores?.why ?? '',
          transcript_self: transcSelf,
          transcript_opp:  transcOpp,
          visibility:      visibility,
          scores_json:     JSON.stringify(scores || {})
        })
        if (saveRes.data.success) {
          setDebateResult(prev => prev ? { ...prev, matchId: saveRes.data.match_id, newLevel: saveRes.data.level } : prev)
        }
      } catch (err) {
        console.warn('Không lưu được lịch sử:', err.message)
      }
    }
  }

  const handleRestart = () => {
    setPage('dashboard')
    setDebateResult(null)
    setMode(null)
    cancelMatch()
  }

  const handleViewHistoryMatch = (match) => {
    let detailedScores = {};
    try {
      if (match.scores_json) {
        const parsed = JSON.parse(match.scores_json);
        if (parsed) detailedScores = parsed;
      }
    } catch {
      detailedScores = {}
    }

    const fakeResult = {
      playerA: match.username,
      playerB: match.opponent,
      topic: match.topic,
      mode: match.mode,
      transcript_a: match.transcript_self,
      transcript_b: match.transcript_opp,
      scores: {
        player_a: detailedScores.player_a || { total: match.score_self, deduct: match.fallacies_self },
        player_b: detailedScores.player_b || { total: match.score_opp, deduct: match.fallacies_opp },
        winner: match.result === 'win' ? match.username : match.result === 'lose' ? match.opponent : '',
        why: match.summary || 'Đây là bản xem lại lịch sử trận đấu.',
        comment: detailedScores.comment || '',
        quality: detailedScores.quality || ''
      }
    }
    setDebateResult(fakeResult)
    setPage('score')
  }

  const handleSelfReady = () => {
    setSelfReady(true)
    sendMessage({ type: 'player_ready', target: matchInfo.opponentId })
  }

  const handleDeclineMatch = () => {
    sendMessage({ type: 'player_declined', target: matchInfo.opponentId })
    cancelMatch()
    setPage('mode')
  }

  // --- RENDERS ---

  let content = null;
  if (window.location.pathname === '/sso-callback') {
    content = clerkEnabled
      ? <AuthenticateWithRedirectCallback signUpForceRedirectUrl="/" />
      : <AuthPage onLogin={handleLogin} />
  } else if (page === 'home') {
    content = <HomePage onPlay={handlePlayNowClick} theme={theme} />
  } else if (page === 'auth') {
    content = clerkEnabled
      ? <AuthPageWithClerk onLogin={handleLogin} />
      : <AuthPage onLogin={handleLogin} />
  } else if (page === 'dashboard') {
    content = (
      <ErrorBoundary>
        <Dashboard username={username} onPlay={() => setPage('mode')} onLogout={handleLogout} onViewMatch={handleViewHistoryMatch} sendMessage={sendMessage} registerHandler={registerHandler} theme={theme} setTheme={setTheme} clerkUser={user} />
      </ErrorBoundary>
    )
  } else if (page === 'mode') {
    content = (
      <div>
        <ModeSelector onSelect={handleModeSelect} />
        <button
          onClick={() => setPage('dashboard')}
          className="btn-primary"
          style={{ position: 'fixed', top: '24px', left: '24px', padding: '12px 24px', borderRadius: 'var(--radius-full)' }}
        >
          ← Quay lại
        </button>
      </div>
    )
  } else if (page === 'waiting') {
    content = (
      <RoomWaiting
        onCancel={handleRoomCancel}
        roomError={roomError}
        createdRoomCode={createdRoomCode}
        mode={mode}
      />
    )
  } else if (page === 'ready_check') {
    content = (
      <ReadyCheck 
        matchInfo={matchInfo} 
        onReady={handleSelfReady} 
        onCancel={handleDeclineMatch} 
        getDisplayName={getDisplayName}
      />
    )
  } else if (page === 'debate') {
    const currentMatch = mode === 'solo_ai' ? {
      topic: soloTopic,
      isHost: true,
      opponentId: 'ai_bot'
    } : matchInfo

    const isHost = mode === 'solo_ai' ? true : currentMatch?.isHost
    const opponentName = mode === 'solo_ai' ? 'AI Gemini' : (currentMatch?.opponentName || currentMatch?.opponentId || 'Đối thủ')

    const roomData = {
      topic: currentMatch?.topic || 'Chủ đề ngẫu nhiên',
      playerA: isHost ? getDisplayName(username) : opponentName,
      playerB: isHost ? opponentName : getDisplayName(username),
      isLocalHost: isHost,
      rawUsernameA: isHost ? username : currentMatch?.opponentId,
      rawUsernameB: isHost ? currentMatch?.opponentId : username
    }

    content = (
      <DebateRoom
        roomData={roomData}
        roomInfo={currentMatch}
        mode={mode}
        username={username}
        remotePlayerName={roomData.playerB}
        onFinish={handleDebateFinish}
        registerHandler={registerHandler}
        sendMessage={sendMessage}
        onCancel={() => {
          if (mode !== 'solo_ai') cancelMatch()
          setPage('mode')
        }}
      />
    )
  } else if (page === 'text_debate') {
    const currentMatch = mode === 'text_solo' ? {
      topic: soloTopic,
      isHost: true,
      opponentId: 'ai_bot'
    } : matchInfo

    const isHost = mode === 'text_solo' ? true : currentMatch?.isHost
    const opponentName = mode === 'text_solo' ? 'AI Gemini' : (currentMatch?.opponentName || currentMatch?.opponentId || 'Đối thủ')

    const roomData = {
      topic: currentMatch?.topic || 'Chủ đề ngẫu nhiên',
      playerA: isHost ? getDisplayName(username) : opponentName,
      playerB: isHost ? opponentName : getDisplayName(username),
      isLocalHost: isHost,
      rawUsernameA: isHost ? username : currentMatch?.opponentId,
      rawUsernameB: isHost ? currentMatch?.opponentId : username
    }

    content = (
      <TextDebateRoom
        roomData={roomData}
        roomInfo={currentMatch}
        mode={mode}
        username={username}
        onFinish={handleDebateFinish}
        registerHandler={registerHandler}
        sendMessage={sendMessage}
        clerkUser={user}
        onCancel={() => {
          if (mode !== 'text_solo') {
            if (currentMatch?.opponentId) {
              sendMessage({ type: 'player_declined', target: currentMatch.opponentId, reason: 'left' })
            }
            cancelMatch()
          }
          setMode(null)
          setPage('mode')
        }}
      />
    )
  } else if (page === 'score') {
    content = (
      <Scoreboard
        result={debateResult}
        onRestart={handleRestart}
        currentUser={username}
      />
    )
  } else {
    content = <div>Error: Unknown page</div>
  }

  return (
    <>
      {content}
      {page !== 'home' && page !== 'auth' && (
        <>
          <InteractiveMascot username={username} />
          <ErrorBoundary>
            <MusicPlayer />
          </ErrorBoundary>
        </>
      )}
    </>
  )
}

export default App
