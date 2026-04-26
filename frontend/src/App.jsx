import { useState, useEffect } from 'react'
import axios from 'axios'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'
import ModeSelector from './components/ModeSelector'
import RoomWaiting from './components/RoomWaiting'
import DebateRoom from './components/DebateRoom'
import Scoreboard from './components/Scoreboard'
import { useSignaling } from './hooks/useSignaling'

const API_BASE = 'http://localhost:8000'

function App() {
  const [page, setPage] = useState('auth')
  const [username, setUsername] = useState('')
  const [debateResult, setDebateResult] = useState(null)
  const [mode, setMode] = useState(null) // '1v1' | 'solo_ai' | '2v2'
  const [soloTopic, setSoloTopic] = useState('AI có thay thế được con người?')

  // Signaling Hook
  const { matchInfo, findMatch, cancelMatch, registerHandler, sendMessage } = useSignaling(username)

  // Tự động chuyển qua DebateRoom khi có match
  useEffect(() => {
    if (matchInfo && page === 'waiting') {
      setPage('debate')
    }
  }, [matchInfo, page])

  const handleLogin = (name) => {
    setUsername(name)
    setPage('dashboard')
  }

  const handleLogout = () => {
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
    } else {
      setPage('waiting')
      findMatch(info.mode)
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

  // --- RENDERS ---

  if (page === 'auth') {
    return <AuthPage onLogin={handleLogin} />
  }

  if (page === 'dashboard') {
    return <Dashboard username={username} onPlay={() => setPage('mode')} onLogout={handleLogout} onViewMatch={handleViewHistoryMatch} />
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
    const opponentName = mode === 'solo_ai' ? 'AI Gemini' : (currentMatch?.opponentId || 'Đối thủ')

    const roomData = {
      topic: currentMatch?.topic || 'Chủ đề ngẫu nhiên',
      // Host luôn là Player A, Guest luôn là Player B
      playerA: isHost ? username : opponentName,
      playerB: isHost ? opponentName : username,
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
