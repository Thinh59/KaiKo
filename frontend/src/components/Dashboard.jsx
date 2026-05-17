import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { useUser } from '@clerk/clerk-react'

const API_BASE = 'http://localhost:8000'

const RESULT_META = {
  win:  { label: 'Thắng',  color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: '🏆' },
  lose: { label: 'Thua',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '💔' },
  draw: { label: 'Hòa',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: '🤝' },
}

function HistoryRow({ match, onClick }) {
  const meta = RESULT_META[match.result] ?? RESULT_META.draw
  const date = new Date(match.played_at + 'Z').toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div onClick={onClick} style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr 90px 80px 80px 80px',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 20px',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      marginBottom: '10px',
      transition: 'background 0.2s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    >
      {/* Kết quả */}
      <div style={{
        textAlign: 'center',
        background: meta.bg,
        border: `1px solid ${meta.color}`,
        borderRadius: 'var(--radius-sm)',
        padding: '4px 0',
      }}>
        <div style={{ fontSize: '1.2rem' }}>{meta.icon}</div>
        <div style={{ fontSize: '0.7rem', color: meta.color, fontWeight: '700' }}>{meta.label}</div>
      </div>

      {/* Topic + opponent */}
      <div>
        <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
          {match.topic || '(Không có chủ đề)'}
        </p>
        <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          vs <strong style={{ color: '#a855f7' }}>{match.opponent}</strong>
          {'  ·  '}{match.mode === 'solo_ai' ? '🤖 Solo AI' : '👥 1v1'}
          {'  ·  '}{date}
        </p>
      </div>

      {/* Điểm bản thân */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-primary)' }}>{match.score_self}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Điểm bạn</div>
      </div>

      {/* Điểm đối thủ */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#a855f7' }}>{match.score_opp}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Đối thủ</div>
      </div>

      {/* Ngụy biện */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: match.fallacies_self > 0 ? '#ef4444' : '#10b981' }}>
          {match.fallacies_self > 0 ? `-${match.fallacies_self * 5}đ` : '✓'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trừ điểm</div>
      </div>

      {/* Mode badge */}
      <div style={{ textAlign: 'right' }}>
        <span style={{
          background: 'rgba(99,102,241,0.1)',
          color: 'var(--accent-primary)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 'var(--radius-full)',
          padding: '3px 10px',
          fontSize: '0.78rem',
          fontWeight: '600'
        }}>#{match.id}</span>
      </div>
    </div>
  )
}

const EventWorkspaceModal = ({ event, onClose, username }) => {
  const [loading, setLoading] = useState(true);
  const editorRef = useRef(null);

  useEffect(() => {
    // fetch existing submission
    axios.get(`${API_BASE}/event-submission/${event.id}/${encodeURIComponent(username)}`)
      .then(res => {
        if (res.data.success && res.data.content) {
          if (editorRef.current) editorRef.current.innerHTML = res.data.content;
        }
      })
      .finally(() => setLoading(false));
  }, [event.id, username]);

  const handleFormat = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleSave = async () => {
    const htmlContent = editorRef.current.innerHTML;
    try {
      const res = await axios.post(`${API_BASE}/submit-event`, { username, event_id: event.id, content: htmlContent });
      if (res.data.success) {
        alert('Đã lưu bài viết thành công!');
        onClose();
      }
    } catch(e) {
      alert('Lỗi lưu bài!');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-primary)', width: '90%', maxWidth: '800px', borderRadius: '16px', padding: '24px', border: '1px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', height: '80vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>📝 Trình Soạn Thảo: {event.title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        
        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải...</p> : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', display: 'flex', gap: '10px', borderRadius: '8px 8px 0 0', border: '1px solid var(--border-light)', borderBottom: 'none' }}>
              <button onClick={() => handleFormat('bold')} style={{ fontWeight: 'bold', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', background: '#e5e7eb', color: '#000', border: '1px solid #d1d5db' }}>B</button>
              <button onClick={() => handleFormat('italic')} style={{ fontStyle: 'italic', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', background: '#e5e7eb', color: '#000', border: '1px solid #d1d5db' }}>I</button>
              <button onClick={() => handleFormat('underline')} style={{ textDecoration: 'underline', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', background: '#e5e7eb', color: '#000', border: '1px solid #d1d5db' }}>U</button>
              <button onClick={() => handleFormat('insertUnorderedList')} style={{ padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', background: '#e5e7eb', color: '#000', border: '1px solid #d1d5db' }}>• Danh sách</button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '0 0 8px 8px', border: '1px solid var(--border-light)', color: '#fff', outline: 'none', fontSize: '1.1rem', lineHeight: '1.6' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '10px' }}>
              <button onClick={onClose} className="btn-secondary" style={{ padding: '10px 20px' }}>Hủy</button>
              <button onClick={handleSave} className="btn-primary" style={{ padding: '10px 20px' }}>Lưu Bài Viết</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Dashboard({ username, onPlay, onLogout, onViewMatch }) {
  const [activeTab, setActiveTab] = useState('home')
  const [activeEvent, setActiveEvent] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0, total: 0, avgScore: 0 })

  const { user } = useUser()

  const [avatarFrame, setAvatarFrame] = useState(localStorage.getItem('kaiko_frame') || 'none')
  const [hasCheckedIn, setHasCheckedIn] = useState(localStorage.getItem('kaiko_checkin_' + username) === new Date().toLocaleDateString('vi-VN'))
  const [extraPoints, setExtraPoints] = useState(parseInt(localStorage.getItem('kaiko_extra_points_' + username) || '0'))

  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [friendInput, setFriendInput] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserStats, setSelectedUserStats] = useState(null)
  const [nickname, setNickname] = useState(localStorage.getItem('kaiko_nickname_' + username) || '')
  const [globalNicknames, setGlobalNicknames] = useState({})
  const [serverPoints, setServerPoints] = useState(0)
  const [myItems, setMyItems] = useState([])
  const [events, setEvents] = useState([])
  const [joinedEvents, setJoinedEvents] = useState([])
  const [selectedAvatar, setSelectedAvatar] = useState(localStorage.getItem('kaiko_avatar_' + username) || '')
  const [selectedBadges, setSelectedBadges] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kaiko_badges_' + username) || '[]') } catch { return [] }
  })

  // All badge-type items with their image mappings
  const RANK_BADGE_CATALOG = [
    { id: 'rank_1',  image: '/assets/badges/crab_baby.png',     name: 'Cua Non (Lv 1+)',    minLevel: 1  },
    { id: 'rank_11', image: '/assets/badges/crab_walker.png',   name: 'Cua Gắt (Lv 11+)',   minLevel: 11 },
    { id: 'rank_31', image: '/assets/badges/crab_keyboard.png', name: 'Cua Cùm (Lv 31+)',   minLevel: 31 },
    { id: 'rank_61', image: '/assets/badges/crab_judge.png',    name: 'Thư Giãn (Lv 61+)',  minLevel: 61 },
    { id: 'rank_91', image: '/assets/badges/crab_king.png',     name: 'Idol Cua (Lv 91+)',   minLevel: 91 },
  ]
  const BADGE_CATALOG = [
    { id: 'title_best',     image: '/assets/badges/HHKhoeNhatBien.png',  name: 'Khỏe Nhất Biển' },
    { id: 'title_genius',   image: '/assets/badges/title_genus.png',      name: 'Thiên Tài Tinh Tú' },
    { id: 'title_banthan',  image: '/assets/badges/HHBanThan.png',        name: 'Bạn Thân Cua' },
    { id: 'title_kaikonew', image: '/assets/badges/HHKaiKoMoiNhu.png',   name: 'KaiKo Mới Này' },
    { id: 'rename_card',    image: '/assets/badges/rename_card.png',      name: 'Thẻ Biệt Danh' },
    { id: 'avatar_crab_gold', image: '/assets/badges/avatar_crab_gold.png', name: 'Cua Hoàng Đế' },
  ]

  const toggleBadge = (id) => {
    setSelectedBadges(prev => {
      let next
      if (prev.includes(id)) {
        next = prev.filter(b => b !== id)
      } else {
        if (prev.length >= 5) return prev // max 5
        next = [...prev, id]
      }
      localStorage.setItem('kaiko_badges_' + username, JSON.stringify(next))
      return next
    })
  }

  const [showBadgeSelector, setShowBadgeSelector] = useState(false)

  const avatarUrl = selectedAvatar || user?.imageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + username

  const displayUsername = globalNicknames[username] || nickname || username
  const getDisplayName = (u) => globalNicknames[u] || u

  const isGuest = username?.startsWith('Guest_')

  // Fetch server-side user info (points + items)
  const loadMyInfo = useCallback(async () => {
    if (isGuest) return
    try {
      const res = await axios.get(`${API_BASE}/my-info/${encodeURIComponent(username)}`)
      if (res.data.success) {
        setServerPoints(res.data.store_points || 0)
        setMyItems(res.data.items || [])
      }
    } catch(e) {}
  }, [username, isGuest])

  const loadEvents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/events`)
      if (res.data.success) setEvents(res.data.events)
    } catch(e) {}
  }, [])

  const loadMyEvents = useCallback(async () => {
    if (isGuest) return
    try {
      const res = await axios.get(`${API_BASE}/my-events/${encodeURIComponent(username)}`)
      if (res.data.success) setJoinedEvents(res.data.events || [])
    } catch(e) {}
  }, [username, isGuest])

  const handleCheckIn = async () => {
    if (!hasCheckedIn) {
      localStorage.setItem('kaiko_checkin_' + username, new Date().toLocaleDateString('vi-VN'))
      setHasCheckedIn(true)
      try {
        const res = await axios.post(`${API_BASE}/checkin`, { username })
        if (res.data.success) {
          setServerPoints(res.data.store_points)
          alert(`Điểm danh thành công! +50 Điểm Tích Lũy. Tổng: ${res.data.store_points} điểm.`)
        }
      } catch(e) {
        // fallback localStorage
        const newExtra = extraPoints + 50
        localStorage.setItem('kaiko_extra_points_' + username, newExtra.toString())
        setExtraPoints(newExtra)
        alert('Điểm danh thành công! Bạn nhận được 50 Điểm Tích Lũy.')
      }
    }
  }

  const handleJoinEvent = async (eventId, title) => {
    if (isGuest) {
      alert('Vui lòng đăng nhập để tham gia sự kiện!')
      return
    }
    if (!window.confirm(`Bạn có muốn tham gia sự kiện: ${title}?`)) return
    try {
      const res = await axios.post(`${API_BASE}/join-event`, { username, event_id: eventId })
      if (res.data.success) {
        alert('🎉 Đã đăng ký tham gia sự kiện thành công!')
        loadMyEvents()
      } else {
        alert(`❌ ${res.data.error}`)
      }
    } catch(e) {
      alert('Lỗi kết nối máy chủ!')
    }
  }

  const loadFriends = useCallback(async () => {
    if (isGuest) return
    try {
      const res = await axios.get(`${API_BASE}/friends/${encodeURIComponent(username)}`)
      if (res.data.success) {
        setFriends(res.data.friends || [])
        setFriendRequests(res.data.requests || [])
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách bạn bè:', err)
      setFriends([])
      setFriendRequests([])
    }
  }, [username, isGuest])

  const handleAddFriend = async () => {
    if (friendInput.trim() && friendInput.trim() !== username) {
      if (friends?.length >= 100) {
        alert("Bạn đã đạt giới hạn tối đa 100 người bạn!")
        return
      }
      const target = friendInput.trim()
      try {
        const res = await axios.post(`${API_BASE}/friend-request`, { user: username, target })
        if (res.data.success) {
          alert(`Đã gửi lời mời kết bạn tới: ${target}`)
          setFriendInput('')
        } else {
          alert(`Lỗi: ${res.data.error}`)
        }
      } catch (err) {
        alert("Lỗi kết nối máy chủ")
      }
    } else if (friendInput.trim() === username) {
      alert("Không thể tự kết bạn với chính mình!")
    }
  }

  const handleAcceptRequest = async (requester) => {
    try {
      await axios.post(`${API_BASE}/accept-friend`, { user: username, target: requester })
      loadFriends()
    } catch (e) {}
  }

  const handleDeclineRequest = async (requester) => {
    try {
      await axios.post(`${API_BASE}/decline-friend`, { user: username, target: requester })
      loadFriends()
    } catch (e) {}
  }

  const handleRemoveFriend = async (friendName) => {
    if (window.confirm(`Bạn có chắc muốn xóa ${friendName} khỏi danh sách bạn bè?`)) {
      try {
        await axios.post(`${API_BASE}/remove-friend`, { user: username, target: friendName })
        loadFriends()
      } catch (e) {}
    }
  }

  const handleViewUser = async (targetName) => {
    setSelectedUser(targetName)
    setSelectedUserStats(null)
    try {
        const res = await axios.get(`${API_BASE}/history/${encodeURIComponent(targetName)}?limit=1000`)
        if (res.data.success) {
            const h = res.data.history
            const wins   = h.filter(m => m.result === 'win').length
            const losses = h.filter(m => m.result === 'lose').length
            const draws  = h.filter(m => m.result === 'draw').length
            const exp = wins * 10 + draws * 2 - losses * 2
            const finalExp = Math.max(0, exp)
            const level = Math.floor(finalExp / 100) + 1
            const avgScore = h.length > 0 ? Math.round(h.reduce((acc, m) => acc + m.score_self, 0) / h.length) : 0
            setSelectedUserStats({ wins, losses, draws, total: h.length, level, avgScore, exp: finalExp })
        }
    } catch (e) {
        setSelectedUserStats({ error: true })
    }
  }

  const handleFrameChange = (e) => {
    setAvatarFrame(e.target.value)
    localStorage.setItem('kaiko_frame', e.target.value)
  }

  const frameFileMap = {
    wood: 'wood.png',
    silver: 'silver.png',
    gold: 'gold.png',
    diamond: 'diamond.png',
    fire: 'fire.png',
    diamond_plus: 'KimCuongPlus.png',
  }

  const frameStyles = {
    none: { border: 'none' },
    wood: { border: '5px solid #8B4513', boxShadow: '0 0 10px #8B4513' },
    silver: { border: '5px solid #C0C0C0', boxShadow: '0 0 15px #C0C0C0' },
    gold: { border: '5px solid #FFD700', boxShadow: '0 0 20px #FFD700' },
    diamond: { border: '5px solid #00FFFF', boxShadow: '0 0 25px #00FFFF', filter: 'drop-shadow(0 0 10px #00FFFF)' },
    diamond_plus: { border: '5px solid #a855f7', boxShadow: '0 0 30px #a855f7, 0 0 10px #00FFFF', filter: 'drop-shadow(0 0 12px #a855f7)' },
    fire: { border: '5px solid #f97316', boxShadow: '0 0 25px #ef4444, 0 0 10px #fbbf24', filter: 'drop-shadow(0 0 8px #f97316)' },
  }

  const loadHistory = useCallback(async () => {
    if (isGuest) return
    setHistoryLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/history/${encodeURIComponent(username)}?limit=1000`)
      if (res.data.success) {
        const h = res.data.history
        setHistory(h)
        // Tính stats
        const wins   = h.filter(m => m.result === 'win').length
        const losses = h.filter(m => m.result === 'lose').length
        const draws  = h.filter(m => m.result === 'draw').length
        const avgScore = h.length > 0 ? Math.round(h.reduce((acc, m) => acc + m.score_self, 0) / h.length) : 0
        
        // Tính toán EXP thực tế
        const exp = wins * 10 + draws * 2 - losses * 2
        const finalExp = Math.max(0, exp) // Chỉ điểm kinh nghiệm (Level)
        const level = Math.floor(finalExp / 100) + 1
        const currentExp = finalExp % 100
        const points = extraPoints + wins * 5 // Điểm mua sắm (Tích lũy) = Điểm check-in + Điểm từ trận thắng
        setStats({ wins, losses, draws, total: h.length, avgScore, level, exp: currentExp, totalExp: finalExp, points })
      }
    } catch (err) {
      console.warn('Không tải được lịch sử:', err.message)
    } finally {
      setHistoryLoading(false)
    }
  }, [username, isGuest, extraPoints])

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/leaderboard`)
      if (res.data.success) {
        setLeaderboard(res.data.leaderboard)
      }
    } catch (err) {
      console.warn('Không tải được leaderboard:', err.message)
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  const loadGlobalNicknames = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/nicknames`)
      if (res.data.success) {
        setGlobalNicknames(res.data.nicknames)
      }
    } catch(err) {}
  }, [])

  useEffect(() => {
    loadGlobalNicknames()
  }, [loadGlobalNicknames])

  // Tự động đồng bộ nickname từ localStorage lên backend khi mở Dashboard
  useEffect(() => {
    if (isGuest) return
    const localNick = localStorage.getItem('kaiko_nickname_' + username)
    if (localNick && localNick.trim()) {
      axios.post(`${API_BASE}/set-nickname`, { username, nickname: localNick.trim() })
        .then(() => {
          setGlobalNicknames(prev => ({ ...prev, [username]: localNick.trim() }))
        })
        .catch(() => {})
    }
  }, [username, isGuest])

  useEffect(() => {
    if (activeTab === 'home' || activeTab === 'history') loadHistory()
    if (activeTab === 'leaderboard') loadLeaderboard()
    if (activeTab === 'friends') loadFriends()
    if (activeTab === 'events') { loadEvents(); loadMyEvents(); }
    if (activeTab === 'store' || activeTab === 'home') loadMyInfo()
  }, [activeTab, loadHistory, loadLeaderboard, loadFriends, loadEvents, loadMyEvents, loadMyInfo])

  // Polling for friend requests every 5 seconds
  useEffect(() => {
    if (isGuest) return
    const interval = setInterval(loadFriends, 5000)
    return () => clearInterval(interval)
  }, [loadFriends, isGuest])

  const TABS = [
    { id: 'profile',    icon: '👤', label: 'Hồ sơ cá nhân', color: '#a855f7' },
    { id: 'history',    icon: '📋', label: 'Lịch sử trận đấu', color: '#3b82f6' },
    { id: 'leaderboard',icon: '🏆', label: 'Bảng xếp hạng', color: '#f59e0b' },
    { id: 'friends',    icon: '👥', label: 'Bạn bè', color: '#10b981' },
    { id: 'events',     icon: '🎉', label: 'Sự kiện', color: '#ec4899' },
    { id: 'store',      icon: '🛒', label: 'Cửa hàng', color: '#eab308' },
    { id: 'guide',      icon: '📖', label: 'Hướng dẫn', color: '#6366f1' },
    { id: 'settings',   icon: '⚙️', label: 'Cài đặt', color: '#9ca3af' },
  ]

  const getRankInfo = (level) => {
    if (level < 11) return { title: 'KaiKo Ngang Như Cua Non', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)', icon: '🦀', badgeImage: '/assets/badges/crab_baby.png' }
    if (level < 31) return { title: 'KaiKo Mượt Nhưng Cua Gắt', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: '🌊', badgeImage: '/assets/badges/crab_walker.png' }
    if (level < 61) return { title: 'KaiKo Ngon Như Cua Cùm', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: '🔥', badgeImage: '/assets/badges/crab_keyboard.png' }
    if (level < 91) return { title: 'KaiKo Nhưng Thư Giãn', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', icon: '🧘', badgeImage: '/assets/badges/crab_judge.png' }
    return { title: 'KaiKo Sáng Rực Như Idol Cua Hoàng Đế', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', icon: '👑', badgeImage: '/assets/badges/crab_king.png' }
  }

  const currentLevel = isGuest ? 1 : (stats.level || 1)
  const rank = getRankInfo(currentLevel)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '2rem', width: '100%', maxWidth: '1800px', margin: '0 auto', boxSizing: 'border-box' }}>

      {/* ── Header ── */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.8rem' }}>
              Xin chào, <span style={{ color: 'var(--accent-primary)' }}>{getDisplayName(username)}</span>!
            </h2>
            {isGuest ? (
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                🔒 Tài khoản khách — lịch sử không được lưu. Đăng nhập để đua top!
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid rgba(99,102,241,0.3)' }}>
                  Level {currentLevel}
                </span>
                <span style={{ background: rank.bg, color: rank.color, padding: '4px 12px', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', border: `1px solid ${rank.color}50`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {rank.icon} {rank.title}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-full)', cursor: 'pointer', transition: 'all 0.3s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* ── Content ── */}
        <div className="glass-panel animate-fade-in" style={{ 
          padding: activeTab === 'home' ? '2rem' : '1.5rem', 
          minHeight: '600px', 
          display: 'flex', 
          flexDirection: 'column'
        }}>
          {/* Lớp nền con lồng bên trong */}
          <div style={{
            background: activeTab === 'home' ? 'transparent' : 'rgba(251, 146, 60, 0.12)', // Màu cam nhạt
            borderRadius: '20px',
            padding: activeTab === 'home' ? '0' : '2rem',
            border: activeTab === 'home' ? 'none' : '1px solid rgba(251, 146, 60, 0.2)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)'
          }}>

          {activeTab !== 'home' && (
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <button 
                onClick={() => setActiveTab('home')}
                style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                ← Về Sảnh
              </button>
            </div>
          )}

          {/* HOME (SẢNH CHÍNH) */}
          {activeTab === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '1rem', flex: 1 }}>
              
              <div style={{ marginBottom: '3rem', position: 'relative', display: 'inline-block' }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', zIndex: 10 }}>
                  <button 
                    onClick={handleCheckIn}
                    disabled={hasCheckedIn}
                    style={{ 
                      background: hasCheckedIn ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: hasCheckedIn ? 'rgba(255,255,255,0.3)' : '#fff',
                      border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 20px',
                      cursor: hasCheckedIn ? 'not-allowed' : 'pointer', fontWeight: 'bold',
                      boxShadow: hasCheckedIn ? 'none' : '0 4px 15px rgba(245, 158, 11, 0.4)',
                      transition: 'all 0.3s'
                    }}
                  >
                    {hasCheckedIn ? '✅ Đã Điểm Danh' : '🎁 Điểm Danh'}
                  </button>
                </div>
                
                <button 
                  onClick={onPlay} 
                  className="btn-primary hover-scale" 
                  style={{ 
                    padding: '24px 80px', fontSize: '2.5rem', borderRadius: 'var(--radius-full)', 
                    boxShadow: '0 0 50px rgba(99,102,241,0.6)', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  🎮 Chơi Ngay
                </button>
                
                {!isGuest && (
                  <div style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>
                    ⭐ Điểm Tích Lũy (Mua sắm): <strong style={{ color: '#fbbf24', fontSize: '1.2rem' }}>{serverPoints}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', width: '100%', maxWidth: '1200px' }}>
                {TABS.map(tab => (
                  <div 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `rgba(${parseInt(tab.color.slice(1,3),16)},${parseInt(tab.color.slice(3,5),16)},${parseInt(tab.color.slice(5,7),16)},0.15)`
                      e.currentTarget.style.transform = 'translateY(-5px)'
                      e.currentTarget.style.borderColor = tab.color
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>{tab.icon}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#78350f' }}>{tab.label}</div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* HISTORY */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>📋 Lịch sử trận đấu</h2>
                {!isGuest && (
                  <button onClick={loadHistory} style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-full)', padding: '8px 18px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    🔄 Làm mới
                  </button>
                )}
              </div>

              {isGuest ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                  <p style={{ fontSize: '1.2rem' }}>Lịch sử chỉ được lưu với tài khoản đã đăng ký.</p>
                  <p>Đăng xuất và tạo tài khoản để theo dõi tiến trình của bạn!</p>
                </div>
              ) : historyLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2rem', animation: 'fadeIn 1s infinite alternate' }}>⏳</div>
                  <p>Đang tải lịch sử...</p>
                </div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                  <p style={{ fontSize: '1.2rem' }}>Chưa có trận đấu nào được ghi lại.</p>
                  <p>Hãy chơi một trận và kết quả sẽ tự động lưu tại đây!</p>
                </div>
              ) : (
                <div>
                  {/* Stats mini */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {[
                      { label: `${stats.wins} Thắng`, color: '#10b981' },
                      { label: `${stats.losses} Thua`, color: '#ef4444' },
                      { label: `${stats.draws} Hòa`, color: '#f59e0b' },
                      { label: `TB ${stats.avgScore} điểm`, color: 'var(--accent-primary)' },
                    ].map(s => (
                      <span key={s.label} style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}50`, borderRadius: 'var(--radius-full)', padding: '4px 14px', fontSize: '0.88rem', fontWeight: '600' }}>
                        {s.label}
                      </span>
                    ))}
                  </div>

                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 80px 80px 80px', gap: '12px', padding: '8px 20px', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    <span>KQ</span><span>Trận đấu</span><span style={{ textAlign: 'center' }}>Bạn</span><span style={{ textAlign: 'center' }}>Đối thủ</span><span style={{ textAlign: 'center' }}>Lỗi</span><span style={{ textAlign: 'right' }}>ID</span>
                  </div>

                  {history.map(m => <HistoryRow key={m.id} match={m} onClick={() => onViewMatch(m)} />)}
                </div>
              )}
            </div>
          )}

          {/* LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>🏆 Bảng xếp hạng ELO (Wins)</h2>
                <button onClick={loadLeaderboard} style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-full)', padding: '8px 18px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  🔄 Làm mới
                </button>
              </div>

              {leaderboardLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2rem', animation: 'fadeIn 1s infinite alternate' }}>⏳</div>
                  <p>Đang tải bảng xếp hạng...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <p>Chưa có dữ liệu người chơi.</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px 120px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <span style={{ textAlign: 'center' }}>Top</span>
                    <span>Người chơi</span>
                    <span style={{ textAlign: 'center' }}>Trận</span>
                    <span style={{ textAlign: 'center' }}>Thắng</span>
                    <span style={{ textAlign: 'right' }}>Điểm TB</span>
                  </div>
                  {leaderboard.map((user, idx) => (
                    <div key={user.username} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px 120px', alignItems: 'center', padding: '16px 20px', borderBottom: idx < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', background: username === user.username ? 'rgba(99,102,241,0.1)' : 'transparent', transition: 'background 0.2s' }} onMouseEnter={e => { if (username !== user.username) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }} onMouseLeave={e => { if (username !== user.username) e.currentTarget.style.background = 'transparent' }}>
                      <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#b45309' : 'var(--text-secondary)' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div 
                        onClick={() => handleViewUser(user.username)}
                        style={{ fontWeight: '600', color: username === user.username ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: '1.05rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {getDisplayName(user.username)} {username === user.username && '(Bạn)'}
                      </div>
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{user.total_matches}</div>
                      <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>{user.wins}</div>
                      <div style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{Math.round(user.avg_score)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GUIDE */}
          {activeTab === 'guide' && (
            <div>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>📖 Hướng dẫn sử dụng</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { step: '1', title: 'Chọn chế độ chơi', desc: 'Solo AI (thi đấu với Gemini) hoặc 1v1 (ghép cặp với người chơi khác).' },
                  { step: '2', title: 'Bật Camera & Microphone', desc: 'Cho phép trình duyệt truy cập để AI phân tích giọng nói và phát hiện ngụy biện.' },
                  { step: '3', title: 'Bắt đầu lượt của bạn', desc: 'Bấm "Bắt đầu" và trình bày lập luận. Mỗi lượt tối đa 90 giây.' },
                  { step: '4', title: 'AI phân tích real-time', desc: 'Hệ thống nhận diện giọng nói và bắt lỗi ngụy biện ngay trong lúc bạn nói.' },
                  { step: '5', title: 'Chuyển lượt / Kết thúc', desc: 'Bấm "Chuyển lượt" để nhường quyền. Bấm "Kết thúc" khi cả hai đã phát biểu xong.' },
                  { step: '6', title: 'Nhận kết quả chấm điểm', desc: 'AI Gemini chấm điểm theo Logic, Phong thái, Giọng nói, Phản biện và hiển thị gợi ý cải thiện.' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', flexShrink: 0 }}>{item.step}</div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{item.title}</strong>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.93rem' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && (
            <div>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>⚙️ Cài đặt</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Tài khoản</h4>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>Tên đăng nhập:</p>
                  <input type="text" value={username} readOnly className="glass-input" style={{ padding: '12px', width: '100%', boxSizing: 'border-box' }} />
                  {isGuest && <p style={{ color: '#f59e0b', fontSize: '0.85rem', margin: '8px 0 0' }}>⚠️ Tài khoản khách — lịch sử không được lưu.</p>}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Thiết bị & Quyền</h4>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px' }}>Camera và Microphone cần được cấp quyền để ứng dụng hoạt động tốt.</p>
                  <button
                    onClick={() => navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(() => alert('✅ Quyền đã được cấp!')).catch(() => alert('❌ Bị từ chối. Kiểm tra cài đặt trình duyệt.'))}
                    style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 20px', cursor: 'pointer' }}
                  >
                    🔐 Kiểm tra quyền Camera & Mic
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div style={{ padding: '2rem', textAlign: 'center' }}>

              <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block', width: '150px', height: '150px' }}>
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  style={{ 
                    width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
                    ...frameStyles[avatarFrame]
                  }} 
                />
                {avatarFrame !== 'none' && (
                  <img
                    src={`/assets/frames/${frameFileMap[avatarFrame] || avatarFrame + '.png'}`}
                    alt="Frame Overlay"
                    style={{
                      position: 'absolute',
                      top: '-15%',
                      left: '-15%',
                      width: '130%',
                      height: '130%',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ color: 'var(--text-secondary)', marginRight: '10px' }}>Đổi Khung Avatar:</label>
                  <select value={avatarFrame} onChange={handleFrameChange} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <option value="none">Không có</option>
                    <option value="wood" disabled={currentLevel < 11}>Khung Gỗ (Yêu cầu Lv 11)</option>
                    <option value="silver" disabled={currentLevel < 31}>Khung Bạc (Yêu cầu Lv 31)</option>
                    <option value="gold" disabled={currentLevel < 61}>Khung Vàng (Yêu cầu Lv 61)</option>
                    <option value="diamond" disabled={currentLevel < 91}>Khung Kim Cương (Yêu cầu Lv 91)</option>
                    {myItems.includes('frame_fire') && <option value="fire">Khung Cua Lửa (Store)</option>}
                    {myItems.includes('frame_diamond_plus') && <option value="diamond_plus">Khung Kim Cương Plus (Store)</option>}
                  </select>
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', marginRight: '10px' }}>Đổi Avatar:</label>
                  <select value={selectedAvatar} onChange={(e) => { setSelectedAvatar(e.target.value); localStorage.setItem('kaiko_avatar_' + username, e.target.value); }} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <option value="">Ảnh Mặc định (Bottts)</option>
                    <option value="/assets/avatars/CuaDoTruyenThong.png">Cua Đỏ Truyền Thống</option>
                    <option value="/assets/avatars/CuaXanh.png">Cua Xanh Học Giả</option>
                    {myItems.includes('avatar_crab_gold') && <option value="/assets/badges/avatar_crab_gold.png">Cua Hoàng Đế (Vật phẩm Store)</option>}
                  </select>
                </div>
              </div>

              <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem', textShadow: '0 2px 10px rgba(255,255,255,0.1)' }}>Hồ sơ của {getDisplayName(username)}</h2>
              <div style={{ display: 'inline-block', background: rank.bg, color: rank.color, padding: '8px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1.5rem', border: `1px solid ${rank.color}` }}>
                <span style={{ marginRight: '8px' }}>{rank.icon}</span> 
                Level {currentLevel} - {rank.title}
              </div>

              {!isGuest && (
                <div style={{ width: '350px', margin: '0 auto 1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', height: '24px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ width: `${stats.exp || 0}%`, background: 'linear-gradient(90deg, var(--accent-primary) 0%, #a855f7 100%)', height: '100%', transition: 'width 1s ease-in-out' }}></div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    {stats.exp || 0} / 100 EXP (Tới cấp tiếp theo)
                  </div>
                </div>
              )}

              {/* Huy hiệu rank lớn — chỉ hiện khi chưa có showcase */}
              {(() => {
                const displayBadges = selectedBadges.map(id => [...RANK_BADGE_CATALOG, ...BADGE_CATALOG].find(b => b.id === id)).filter(Boolean)
                if (!isGuest && displayBadges.length > 0) return null
                return (
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <img src={rank.badgeImage} alt="Rank Badge" style={{ height: '140px', width: 'auto', maxWidth: '350px', objectFit: 'contain', filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.4))' }} onError={(e) => { e.target.style.display='none' }} />
                  </div>
                )
              })()}

              {/* === HUY HIỆU SHOWCASE === */}
              {!isGuest && (() => {
                const allAvailable = [
                  ...RANK_BADGE_CATALOG.filter(b => currentLevel >= b.minLevel),
                  ...BADGE_CATALOG.filter(b => myItems.includes(b.id))
                ]
                const allById = Object.fromEntries(allAvailable.map(b => [b.id, b]))
                const displayBadges = selectedBadges.map(id => allById[id]).filter(Boolean)
                return (
                  <div style={{ marginBottom: '2rem' }}>
                    {/* Hàng showcase to, 96px */}
                    {displayBadges.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '1.2rem' }}>
                        {displayBadges.map(b => (
                          <div key={b.id} title={b.name} style={{ textAlign: 'center' }}>
                            <img src={b.image} alt={b.name} style={{ height: '96px', width: '96px', objectFit: 'contain', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.5))' }} onError={(e) => { e.target.style.display='none' }} />
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '96px' }}>{b.name}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Nút mở chọn huy hiệu */}
                    {allAvailable.length > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setShowBadgeSelector(true)}
                          style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                        >
                          🏅 Chọn Huy Hiệu Hiển Thị ({selectedBadges.length}/5)
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}
              
              {!isGuest && (
                <div style={{ display: 'inline-block', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '8px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '2.5rem', border: `1px solid #f59e0b` }}>
                  ⭐ Điểm Tích Lũy (Mua Sắm): {serverPoints}
                </div>
              )}

              {!isGuest && stats.total > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                  {[
                    { label: 'Trận đã chơi', value: stats.total, color: 'var(--accent-primary)', icon: '🎮' },
                    { label: 'Chiến thắng',  value: stats.wins,  color: '#10b981', icon: '🏆' },
                    { label: 'Thất bại',     value: stats.losses,color: '#ef4444', icon: '💔' },
                    { label: 'Điểm TB',      value: stats.avgScore, color: '#f59e0b', icon: '⭐' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{s.icon}</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>Chưa có dữ liệu thống kê.</p>
              )}
            </div>
          )}

          {/* FRIENDS */}
          {activeTab === 'friends' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>👥 Danh Sách Bạn Bè</h2>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px 16px', borderRadius: '20px', color: 'var(--accent-primary)', fontWeight: 'bold', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  {friends.length} / 100
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '3rem' }}>
                <input 
                  type="text" 
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                  placeholder="Nhập tên người chơi để kết bạn..." 
                  style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.1rem' }}
                />
                <button onClick={handleAddFriend} className="btn-primary" style={{ padding: '0 24px', borderRadius: '8px', fontWeight: 'bold' }}>
                  Gửi Yêu Cầu
                </button>
              </div>

                {friendRequests?.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ color: '#f59e0b', marginBottom: '1rem' }}>🔔 Lời Mời Kết Bạn ({friendRequests.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {friendRequests.map(req => (
                        <div key={req} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.1)', padding: '16px 24px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <div style={{ cursor: 'pointer' }} onClick={() => handleViewUser(req)}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{getDisplayName(req)}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}> (@{req} muốn kết bạn)</span>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleAcceptRequest(req)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Chấp nhận</button>
                            <button onClick={() => handleDeclineRequest(req)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>Từ chối</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Danh sách ({friends?.length || 0})</h3>
                {!friends || friends.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Bạn chưa có người bạn nào.</p>
                ) : friends.map(fobj => {
                  const fname = typeof fobj === 'string' ? fobj : fobj.username || fobj
                  const debateCount = fobj?.debate_count || 0
                  const isBestFriend = debateCount >= 50
                  return (
                  <div key={fname} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isBestFriend ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.05)', padding: '16px 24px', borderRadius: '12px', border: `1px solid ${isBestFriend ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => handleViewUser(fname)}>
                      <div style={{ position: 'relative' }}>
                        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${fname}`} alt="avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                        {isBestFriend && <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', fontSize: '1.1rem' }}>💚</div>}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getDisplayName(fname)}
                          {isBestFriend && <span style={{ fontSize: '0.75rem', background: '#10b981', color: '#fff', borderRadius: '12px', padding: '2px 8px' }}>Bạn Thân 💚</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{debateCount > 0 ? `Đã debate ${debateCount} trận cùng nhau` : 'Nhấn để xem hồ sơ'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleRemoveFriend(fname)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                        Xóa
                      </button>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* EVENTS - Dynamic from API */}
          {activeTab === 'events' && (
            <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
              <div style={{ background: 'rgba(99,102,241,0.08)', padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--accent-primary)', marginBottom: '2rem', textAlign: 'left' }}>
                <h3 style={{ color: 'var(--accent-primary)', margin: '0 0 8px 0' }}>📅 Lịch Trình</h3>
                <ul style={{ color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li><strong>Sự kiện Thường:</strong> Mở hàng tuần luân phiên (Thứ 2–5 và Thứ 6–CN).</li>
                  <li><strong>Đại Chiến:</strong> Mở định kỳ đầu tháng 3 mỗi năm, sau khi event nhỏ kết thúc.</li>
                </ul>
              </div>

              {/* Small events */}
              {events.filter(e => e.event_type === 'small').length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '2rem', color: 'var(--accent-primary)', marginBottom: '1.5rem' }}>🎉 Sự Kiện Đang Diễn Ra</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {events.filter(e => e.event_type === 'small').map(ev => {
                      const isOpen = ev.status === 'open'
                      const isUpcoming = ev.status === 'upcoming'
                      return (
                        <div key={ev.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '20px', border: `1px solid ${isOpen ? 'rgba(16,185,129,0.4)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <span style={{ background: isOpen ? 'rgba(16,185,129,0.2)' : isUpcoming ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.2)', color: isOpen ? '#10b981' : isUpcoming ? '#3b82f6' : '#6b7280', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {isOpen ? '🟢 Đang mở' : isUpcoming ? '🔵 Sắp mở' : '⚫ Đã đóng'}
                              </span>
                              {ev.deadline && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Đến {ev.deadline}</span>}
                            </div>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{ev.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1rem' }}>{ev.description}</p>
                            {ev.reward && <div style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>🎁 {ev.reward}</div>}
                          </div>
                          {(() => {
                            const hasJoined = joinedEvents.includes(ev.id)
                            return (
                              <button
                                className={hasJoined || (isOpen && !hasJoined) ? 'btn-primary' : 'btn-secondary'}
                                disabled={(!isOpen && !hasJoined)}
                                onClick={() => {
                                  if (hasJoined) setActiveEvent(ev)
                                  else if (isOpen) handleJoinEvent(ev.id, ev.title)
                                }}
                                style={{ marginTop: '1.5rem', width: '100%', opacity: (isOpen || hasJoined) ? 1 : 0.5, cursor: (isOpen || hasJoined) ? 'pointer' : 'not-allowed', background: hasJoined ? '#10b981' : '', color: hasJoined ? '#fff' : '' }}
                              >
                                {hasJoined ? '✅ Vào Sự Kiện' : isOpen ? 'Tham gia ngay' : isUpcoming ? 'Chưa mở' : 'Đã kết thúc'}
                              </button>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Large event */}
              {events.filter(e => e.event_type === 'large').map(ev => {
                const isLocked = ev.status === 'locked'
                return (
                  <div key={ev.id} style={{ position: 'relative', background: 'rgba(0,0,0,0.5)', padding: '3rem', borderRadius: '24px', border: '2px dashed var(--border-light)', overflow: 'hidden', textAlign: 'center' }}>
                    {isLocked && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                        <h3 style={{ fontSize: '1.8rem', color: '#fff', margin: 0 }}>Sự Kiện Lớn Đang Khép Kín</h3>
                        <p style={{ color: '#aaa', marginTop: '10px' }}>Chỉ mở sau khi tất cả sự kiện nhỏ kết thúc!</p>
                      </div>
                    )}
                    <div style={{ filter: isLocked ? 'blur(4px)' : 'none', opacity: isLocked ? 0.5 : 1 }}>
                      <h2 style={{ fontSize: '2.5rem', color: '#facc15', marginBottom: '1rem', textShadow: '0 4px 20px rgba(250,204,21,0.4)' }}>🎉 {ev.title} 🎉</h2>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{ev.description}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ background: 'rgba(139,92,246,0.1)', border: '2px solid #8b5cf6', borderRadius: '20px', padding: '2rem' }}>
                          <div style={{ fontSize: '5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                            <img src="/assets/mascots/ghost.png" alt="Cua Ma" style={{ width: '100px', height: '100px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }} />
                            <div style={{ display: 'none' }}>👻</div>
                          </div>
                          <h3 style={{ color: '#8b5cf6' }}>Phe Cua Ma</h3>
                        </div>
                        <div style={{ background: 'rgba(234,179,8,0.1)', border: '2px solid #eab308', borderRadius: '20px', padding: '2rem' }}>
                          <div style={{ fontSize: '5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                            <img src="/assets/mascots/god.png" alt="Cua Thần" style={{ width: '100px', height: '100px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }} />
                            <div style={{ display: 'none' }}>😇</div>
                          </div>
                          <h3 style={{ color: '#eab308' }}>Phe Cua Thần</h3>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* CỬA HÀNG - Real purchase logic */}
          {activeTab === 'store' && (
            <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
              <h2 style={{ fontSize: '3rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🛒 Cửa Hàng KaiKo</h2>
              <div style={{ display: 'inline-block', background: 'rgba(251,191,36,0.1)', border: '1px solid #fbbf24', borderRadius: '12px', padding: '8px 24px', marginBottom: '2.5rem', color: '#fbbf24', fontWeight: 'bold', fontSize: '1.2rem' }}>
                ⭐ Điểm Tích Lũy: {serverPoints}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {[
                  { id: 'frame_fire', name: 'Khung Cua Lửa', price: 1500, icon: '🔥', image: 'fire.png', isFrame: true, desc: 'Hiệu ứng cháy sáng quanh Avatar. Mở khóa frame "fire" trong hồ sơ.' },
                  { id: 'rename_card', name: 'Thẻ Đổi Nickname', price: 500, icon: '🎫', image: 'rename_card.png', isFrame: false, desc: 'Cho phép đổi Biệt Danh không giới hạn 1 lần. (Mặc định đã miễn phí)' },
                  { id: 'title_best', name: 'Danh Hiệu: Khỏe Nhất Biển', price: 5000, icon: '👑', image: 'HHKhoeNhatBien.png', isFrame: false, desc: 'Hiển thị huy hiệu vàng đặc biệt kế bên tên trong leaderboard và phòng debate.' },
                  { id: 'frame_diamond_plus', name: 'Khung Kim Cương Plus', price: 2000, icon: '💎', image: 'KimCuongPlus.png', isFrame: true, desc: 'Phiên bản nâng cấp của Khung Kim Cương với hiệu ứng pulse. Yêu cầu Lv 61+.' },
                  { id: 'avatar_crab_gold', name: 'Avatar Cua Hoàng Đế', price: 800, icon: '🦀', image: 'avatar_crab_gold.png', isFrame: false, desc: 'Avatar cua vàng độc quyền. Dùng trong hồ sơ cá nhân.' },
                  { id: 'title_genius', name: 'Danh Hiệu: Thiên Tài Tinh Tú', price: 3000, icon: '✨', image: 'title_genus.png', isFrame: false, desc: 'Danh hiệu đặc biệt cho người top 1 event khi đang ở level < 11.' },
                  { id: 'title_banthan', name: 'Danh Hiệu: Bạn Thân Cua', price: 1200, icon: '🦀', image: 'HHBanThan.png', isFrame: false, desc: 'Danh hiệu đặc biệt cho người yêu cộng đồng KaiKo.' },
                  { id: 'title_kaikonew', name: 'Danh Hiệu: KaiKo Mới Này', price: 800, icon: '🌟', image: 'HHKaiKoMoiNhu.png', isFrame: false, desc: 'Danh hiệu chào mừng người mới gia nhập KaiKo.' },
                ].map(item => {
                  const owned = myItems.includes(item.id)
                  const canAfford = serverPoints >= item.price
                  return (
                    <div key={item.id} style={{ background: owned ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: `1px solid ${owned ? 'rgba(16,185,129,0.4)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {owned && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#10b981', color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Đã có</div>}
                      <div style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', height: '80px' }}>
                        <img src={item.isFrame ? `/assets/frames/${item.image}` : `/assets/badges/${item.image}`} alt={item.name} style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none'; if (e.target.nextSibling) e.target.nextSibling.style.display='block' }} />
                        <div style={{ display: 'none' }}>{item.icon}</div>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{item.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.2rem', flex: 1 }}>{item.desc}</p>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: canAfford || owned ? '#fbbf24' : '#ef4444', marginBottom: '1rem' }}>{item.price} ⭐</div>
                      <button
                        onClick={async () => {
                          if (owned) return
                          if (!canAfford) { alert(`Không đủ điểm! Cần ${item.price}, bạn có ${serverPoints}.`); return }
                          if (!window.confirm(`Xác nhận mua "${item.name}" với ${item.price} điểm?`)) return
                          try {
                            const res = await axios.post(`${API_BASE}/purchase`, { username, item_id: item.id, price: item.price })
                            if (res.data.success) {
                              setServerPoints(res.data.remaining_points)
                              setMyItems(prev => [...prev, item.id])
                              alert(`🎉 Mua thành công! Còn lại ${res.data.remaining_points} điểm.`)
                            } else {
                              alert(res.data.error)
                            }
                          } catch(e) { alert('Lỗi kết nối!') }
                        }}
                        disabled={owned}
                        className={owned ? 'btn-secondary' : 'btn-primary'}
                        style={{ width: '100%', opacity: owned ? 0.6 : 1, cursor: owned ? 'default' : 'pointer' }}
                      >
                        {owned ? 'Đã sở hữu' : canAfford ? 'Mua Ngay' : 'Không đủ điểm'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CÀI ĐẶT */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '2rem' }}>⚙️ Cài Đặt</h2>
              
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '1.5rem' }}>Thông tin hiển thị</h3>
                
                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Biệt danh (Nickname)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Nhập biệt danh của bạn..." 
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem' }}
                  />
                  <button 
                    onClick={async () => {
                      localStorage.setItem('kaiko_nickname_' + username, nickname)
                      try {
                        await axios.post(`${API_BASE}/set-nickname`, { username, nickname })
                        setGlobalNicknames(prev => ({...prev, [username]: nickname}))
                      } catch(e) {}
                      alert('Đã lưu biệt danh thành công!')
                    }}
                    className="btn-primary"
                  >
                    Lưu
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '10px' }}>
                  Biệt danh này sẽ hiển thị thay thế cho tên đăng nhập gốc trong các trận tranh biện.
                </p>
              </div>
            </div>
          )}

          {/* CÁC TAB KHÁC CHƯA CÓ NỘI DUNG */}
          {['guide'].includes(activeTab) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1rem', filter: 'grayscale(1)' }}>🚧</div>
              <h2>Tính năng đang phát triển</h2>
              <p>Mục này sẽ sớm ra mắt trong các bản cập nhật tới!</p>
            </div>
          )}

          </div> {/* End inner background div */}
        </div>
      </div>

      {/* Modal Hồ sơ người chơi khác */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setSelectedUser(null)}>
          <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '500px', border: '1px solid rgba(251, 146, 60, 0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block', width: '100px', height: '100px' }}>
                {(() => {
                  let theirAvatar = (selectedUser === username) ? selectedAvatar : localStorage.getItem('kaiko_avatar_' + selectedUser)
                  let theirFrame = (selectedUser === username) ? avatarFrame : localStorage.getItem('kaiko_frame_' + selectedUser)
                  
                  // Tự động gán avatar/khung xịn cho các tài khoản giả lập/chưa set
                  if (!theirAvatar && selectedUser !== username && selectedUserStats) {
                    if (selectedUserStats.level >= 91) theirAvatar = '/assets/badges/avatar_crab_gold.png'
                    else if (selectedUserStats.level >= 61) theirAvatar = '/assets/avatars/CuaXanh.png'
                    else if (selectedUserStats.level >= 11) theirAvatar = '/assets/avatars/CuaDoTruyenThong.png'
                  }
                  
                  if (!theirFrame && selectedUser !== username && selectedUserStats) {
                    if (selectedUserStats.level >= 91) theirFrame = 'diamond_plus'
                    else if (selectedUserStats.level >= 61) theirFrame = 'gold'
                    else if (selectedUserStats.level >= 31) theirFrame = 'silver'
                    else if (selectedUserStats.level >= 11) theirFrame = 'wood'
                    else theirFrame = 'none'
                  }
                  
                  if (!theirFrame) theirFrame = 'none'
                  
                  return (
                    <>
                      <img 
                        src={theirAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUser}`} 
                        alt="Avatar" 
                        style={{ 
                          width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.1)',
                          ...(frameStyles[theirFrame] || {})
                        }} 
                      />
                      {theirFrame !== 'none' && (
                        <img
                          src={`/assets/frames/${frameFileMap[theirFrame] || theirFrame + '.png'}`}
                          alt="Frame Overlay"
                          style={{ position: 'absolute', top: '-15%', left: '-15%', width: '130%', height: '130%', pointerEvents: 'none', zIndex: 10 }}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      )}
                    </>
                  )
                })()}
              </div>
              <h2 style={{ margin: '0 0 5px', color: 'var(--text-primary)' }}>{getDisplayName(selectedUser)}</h2>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>@{selectedUser}</div>
              
              {!selectedUserStats ? (
                <p style={{ color: 'var(--text-secondary)' }}>Đang tải thông tin...</p>
              ) : selectedUserStats.error ? (
                <p style={{ color: '#ef4444' }}>Không thể tải thông tin người chơi này.</p>
              ) : (
                <>
                  {/* Huy hiệu showcase của bạn bè */}
                  {(() => {
                    try {
                      const theirBadges = JSON.parse(localStorage.getItem('kaiko_badges_' + selectedUser) || '[]')
                      const allCatalog = [...RANK_BADGE_CATALOG, ...BADGE_CATALOG]
                      let display = theirBadges.map(id => allCatalog.find(b => b.id === id)).filter(Boolean)
                      
                      // Nếu họ chưa set showcase badge nào, tự động lấy các huy hiệu Rank họ đã đạt được (tối đa 5 cái gần nhất)
                      if (display.length === 0 && selectedUserStats?.level) {
                        display = RANK_BADGE_CATALOG.filter(b => selectedUserStats.level >= b.minLevel).slice(-5).reverse()
                      }
                      
                      if (display.length > 0) {
                        return (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            {display.map(b => (
                              <div key={b.id} title={b.name}>
                                <img src={b.image} alt={b.name} style={{ height: '60px', width: '60px', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} onError={(e) => { e.target.style.display='none' }} />
                              </div>
                            ))}
                          </div>
                        )
                      }
                    } catch {}
                    
                    // Nếu không có huy hiệu showcase thì hiện huy hiệu rank mặc định
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <img src={getRankInfo(selectedUserStats.level).badgeImage} alt="Rank Badge" style={{ height: '90px', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))' }} onError={(e) => { e.target.style.display='none' }} />
                      </div>
                    )
                  })()}
                  <div style={{ display: 'inline-block', background: getRankInfo(selectedUserStats.level).bg, color: getRankInfo(selectedUserStats.level).color, padding: '4px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', marginBottom: '1.5rem', border: `1px solid ${getRankInfo(selectedUserStats.level).color}50` }}>
                    <span style={{ marginRight: '8px' }}>{getRankInfo(selectedUserStats.level).icon}</span> Level {selectedUserStats.level} - {getRankInfo(selectedUserStats.level).title}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-around', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{selectedUserStats.total}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trận</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{selectedUserStats.wins}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Thắng</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{selectedUserStats.losses}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Thua</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '15px', fontSize: '1.1rem', color: '#f59e0b', fontWeight: 'bold' }}>
                    ⭐ Điểm Kinh Nghiệm (EXP): {selectedUserStats.exp}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {activeEvent && <EventWorkspaceModal event={activeEvent} onClose={() => setActiveEvent(null)} username={username} />}

      {/* === MODAL CHỌN HUY HIỆU === */}
      {showBadgeSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowBadgeSelector(false)}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '20px', width: '90%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(168,85,247,0.4)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>🏅 Chọn Huy Hiệu Hiển Thị</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Tối đa 5 — Đã chọn: {selectedBadges.length}/5</div>
              </div>
              <button onClick={() => setShowBadgeSelector(false)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '1rem 1.5rem', flex: 1 }}>
              {(() => {
                const allAvailable = [
                  ...RANK_BADGE_CATALOG.filter(b => currentLevel >= b.minLevel),
                  ...BADGE_CATALOG.filter(b => myItems.includes(b.id))
                ]
                // Group into rows of 3
                const rows = []
                for (let i = 0; i < allAvailable.length; i += 3) rows.push(allAvailable.slice(i, i + 3))
                return rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    {row.map(b => {
                      const active = selectedBadges.includes(b.id)
                      const disabled = !active && selectedBadges.length >= 5
                      return (
                        <div
                          key={b.id}
                          onClick={() => !disabled && toggleBadge(b.id)}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                            padding: '12px 8px', borderRadius: '12px', cursor: disabled ? 'not-allowed' : 'pointer',
                            border: active ? '2px solid #a855f7' : '2px solid rgba(255,255,255,0.08)',
                            background: active ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                            opacity: disabled ? 0.4 : 1, transition: 'all 0.2s'
                          }}
                        >
                          <img src={b.image} alt={b.name} style={{ height: '72px', width: '72px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none' }} />
                          <div style={{ fontSize: '0.75rem', color: active ? '#a855f7' : 'var(--text-secondary)', textAlign: 'center', fontWeight: active ? 'bold' : 'normal' }}>{b.name}</div>
                          {active && <div style={{ fontSize: '0.65rem', background: '#a855f7', color: '#fff', borderRadius: '10px', padding: '1px 8px' }}>✓ Đang hiển</div>}
                        </div>
                      )
                    })}
                    {/* Đệm ô trống nếu hàng không đủ 3 */}
                    {row.length < 3 && Array(3 - row.length).fill(0).map((_, i) => <div key={'empty' + i} style={{ flex: 1 }} />)}
                  </div>
                ))
              })()}
            </div>
            <div style={{ padding: '0.8rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
              <button onClick={() => setShowBadgeSelector(false)} className="btn-primary" style={{ padding: '8px 24px' }}>Xong</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
