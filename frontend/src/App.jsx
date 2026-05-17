import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useUser, useAuth, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import HomePage from './components/HomePage'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'
import ModeSelector from './components/ModeSelector'
import RoomWaiting from './components/RoomWaiting'
import ReadyCheck from './components/ReadyCheck'
import DebateRoom from './components/DebateRoom'
import Scoreboard from './components/Scoreboard'
import { useSignaling } from './hooks/useSignaling'

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

const API_BASE = 'http://localhost:8000'

function App() {
  const [page, setPage] = useState('home')
  const [username, setUsername] = useState('')
  const [debateResult, setDebateResult] = useState(null)
  const [mode, setMode] = useState(null) // '1v1' | 'solo_ai' | '2v2'
  const [soloTopic, setSoloTopic] = useState('AI có thay thế được con người?')
  const [globalNicknames, setGlobalNicknames] = useState({})

  useEffect(() => {
    axios.get(`${API_BASE}/nicknames`)
      .then(res => { if (res.data.success) setGlobalNicknames(res.data.nicknames) })
      .catch(e => {})
  }, [])
  
  const getDisplayName = (u) => globalNicknames[u] || u

  const [selfReady, setSelfReady] = useState(false)
  const [oppReady, setOppReady] = useState(false)

  // Signaling Hook
  const { matchInfo, findMatch, createRoom, joinRoom, roomError, createdRoomCode, cancelMatch, registerHandler, sendMessage } = useSignaling(username)

  // 1. Chuyển từ waiting -> ready_check
  useEffect(() => {
    if (matchInfo && page === 'waiting') {
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
    const cleanupDecline = registerHandler('player_declined', () => {
      alert("Đối thủ đã từ chối trận đấu, hoặc đang bận (AFK)!")
      cancelMatch()
      setPage('mode')
    })
    return () => {
      // Dọn dẹp (tùy thuộc vào implement của registerHandler)
    }
  }, [registerHandler, cancelMatch])

  // 3. Nếu cả 2 cùng ready, vào phòng Debate
  useEffect(() => {
    if (selfReady && oppReady && page === 'ready_check') {
      setPage('debate')
    }
  }, [selfReady, oppReady, page])

  // Clerk Hooks
  const { isSignedIn, user } = useUser()
  const { signOut } = useAuth()

  // Tự động đăng nhập khi Clerk báo đã sign in
  useEffect(() => {
    if (isSignedIn && user && (page === 'auth' || page === 'home')) {
      const name = user.firstName || user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Player'
      handleLogin(name)
    }
  }, [isSignedIn, user, page])

  const handlePlayNowClick = () => {
    if (isSignedIn && username) {
      setPage('dashboard')
    } else {
      setPage('auth')
    }
  }

  const handleLogin = (name) => {
    setUsername(name)
    setPage('dashboard')
  }

  const handleLogout = async () => {
    await signOut()
    setUsername('')
    setPage('auth')
  }

  const handleModeSelect = async (info) => {
    setMode(info.mode)
    if (info.mode === 'solo_ai') {
      try {
        const res = await axios.get(`${API_BASE}/random-topic`)
        if (res.data.success) setSoloTopic(res.data.topic)
      } catch(e) {
        console.warn("Failed to fetch random topic", e)
      }
      setPage('debate')
    } else if (info.mode === 'custom_create') {
      setPage('waiting')
      createRoom()
    } else if (info.mode === 'custom_join') {
      setPage('waiting')
      joinRoom(info.roomCode)
    } else {
      setPage('waiting')
      const localNick = localStorage.getItem('kaiko_nickname_' + username)
      findMatch(info.mode, localNick && localNick.trim() ? localNick.trim() : username)
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
        const selfScore = scores?.player_a?.total ?? 0
        const oppScore  = scores?.player_b?.total ?? 0
        const winner    = scores?.winner ?? ''
        const resultStr = winner === result.playerA ? 'win'
          : winner === result.playerB ? 'lose' : 'draw'

        await axios.post(`${API_BASE}/save-match`, {
          username:       result.playerA,
          opponent:       result.playerB,
          topic:          result.topic ?? '',
          mode:           mode ?? 'solo_ai',
          result:         resultStr,
          score_self:     selfScore,
          score_opp:      oppScore,
          fallacies_self: scores?.player_a?.deduct ?? 0,
          fallacies_opp:  scores?.player_b?.deduct ?? 0,
          summary:        scores?.why ?? '',
        })
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
    const fakeResult = {
      playerA: match.username,
      playerB: match.opponent,
      topic: match.topic,
      scores: {
        player_a: { total: match.score_self, deduct: match.fallacies_self },
        player_b: { total: match.score_opp, deduct: match.fallacies_opp },
        winner: match.result === 'win' ? match.username : match.result === 'lose' ? match.opponent : '',
        why: match.summary || 'Đây là bản xem lại lịch sử trận đấu.'
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

  if (window.location.pathname === '/sso-callback') {
    return <AuthenticateWithRedirectCallback signUpForceRedirectUrl="/" />;
  }

  if (page === 'home') {
    return <HomePage onPlay={handlePlayNowClick} />
  }

  if (page === 'auth') {
    return <AuthPage onLogin={handleLogin} />
  }

  if (page === 'dashboard') {
    return (
      <ErrorBoundary>
        <Dashboard username={username} onPlay={() => setPage('mode')} onLogout={handleLogout} onViewMatch={handleViewHistoryMatch} />
      </ErrorBoundary>
    )
  }

  if (page === 'mode') {
    return (
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
  }

  if (page === 'waiting') {
    return (
      <RoomWaiting
        onCancel={handleRoomCancel}
        roomError={roomError}
        createdRoomCode={createdRoomCode}
        mode={mode}
      />
    )
  }

  if (page === 'ready_check') {
    return (
      <ReadyCheck 
        matchInfo={matchInfo} 
        onReady={handleSelfReady} 
        onCancel={handleDeclineMatch} 
        getDisplayName={getDisplayName}
      />
    )
  }

  if (page === 'debate') {
    // Nếu là Solo AI, tự tạo thông tin mock
    const currentMatch = mode === 'solo_ai' ? {
      topic: soloTopic,
      isHost: true,
      opponentId: 'ai_bot'
    } : matchInfo

    const isHost = mode === 'solo_ai' ? true : currentMatch?.isHost
    const opponentName = mode === 'solo_ai' ? 'AI Gemini' : (currentMatch?.opponentName || currentMatch?.opponentId || 'Đối thủ')

    const roomData = {
      topic: currentMatch?.topic || 'Chủ đề ngẫu nhiên',
      // Host luôn là Player A, Guest luôn là Player B
      playerA: isHost ? getDisplayName(username) : opponentName,
      playerB: isHost ? opponentName : getDisplayName(username),
      isLocalHost: isHost // Lưu lại để DebateRoom biết mình là ai
    }

    return (
      <DebateRoom
        roomData={roomData}
        roomInfo={currentMatch}
        mode={mode}
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
  }

  if (page === 'score') {
    return (
      <Scoreboard
        result={debateResult}
        onRestart={handleRestart}
      />
    )
  }

  return <div>Error: Unknown page</div>
}

export default App
