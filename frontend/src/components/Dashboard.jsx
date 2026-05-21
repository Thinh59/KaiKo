import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { useUser } from '@clerk/clerk-react'

const API_BASE = 'http://localhost:8000'

const RESULT_META = {
  win: { label: 'Thắng', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: '🏆' },
  lose: { label: 'Thua', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: '💔' },
  draw: { label: 'Hòa', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '🤝' },
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

      <div>
        <p style={{
          margin: 0, color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px'
        }}>
          {match.topic || '(Không có chủ đề)'}
        </p>
        <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          vs <strong style={{ color: '#a855f7' }}>{match.opponent}</strong>
          {'  ·  '}
          {match.mode?.startsWith('text_') ? '💬 Chat' : match.mode === 'solo_ai' ? '🤖 Solo AI' : '🎥 Video'}
          {' '}
          {match.mode === 'text_1v1' ? '1v1' : match.mode === 'text_solo' ? 'Solo' : match.mode === '1v1' ? '1v1' : ''}
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
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <span style={{
          background: match.mode?.startsWith('text_') ? 'rgba(168,85,247,0.12)' : 'rgba(99,102,241,0.1)',
          color: match.mode?.startsWith('text_') ? '#a855f7' : 'var(--accent-primary)',
          border: `1px solid ${match.mode?.startsWith('text_') ? 'rgba(168,85,247,0.3)' : 'rgba(99,102,241,0.3)'}`,
          borderRadius: 'var(--radius-full)',
          padding: '3px 10px',
          fontSize: '0.78rem',
          fontWeight: '600'
        }}>#{match.id}</span>
        <span style={{
          fontSize: '0.7rem',
          color: match.visibility === 'public' ? '#10b981' : 'var(--text-secondary)',
          background: 'rgba(0,0,0,0.3)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {match.visibility === 'public' ? '🌍 Công khai' : '🔒 Riêng tư'}
        </span>
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
    } catch (e) {
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

const EventVotingModal = ({ event, onClose, username }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchSubmissions();
  }, [event.id]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/event-submissions-list/${event.id}`);
      if (res.data.success) {
        setSubmissions(res.data.submissions);
      }
    } catch (e) { }
    setLoading(false);
  };

  const handleVote = async (participantId) => {
    try {
      const res = await axios.post(`${API_BASE}/vote-submission`, { participant_id: participantId, voter_username: username });
      if (res.data.success) {
        alert(`Bình chọn thành công! Bạn còn ${res.data.remaining_votes} lượt vote hôm nay.`);
        fetchSubmissions(); // reload to update vote counts
      } else {
        alert(res.data.error || 'Lỗi bình chọn!');
      }
    } catch (e) {
      alert('Lỗi kết nối!');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-primary)', width: '90%', maxWidth: '800px', borderRadius: '16px', padding: '24px', border: '1px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', height: '80vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>👍 Bình chọn: {event.title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách bài viết...</p> : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '10px' }}>
            {submissions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Chưa có bài viết nào cho sự kiện này.</p>
            ) : (
              submissions.map(sub => {
                const isExpanded = expandedId === sub.participant_id;
                return (
                  <div key={sub.participant_id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>@{sub.username}</div>
                      <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>⭐ {sub.votes} Votes</div>
                    </div>
                    <div
                      style={{
                        color: 'var(--text-primary)',
                        maxHeight: isExpanded ? 'none' : '60px',
                        overflow: 'hidden',
                        position: 'relative',
                        whiteSpace: 'pre-wrap'
                      }}
                      dangerouslySetInnerHTML={{ __html: sub.submission_text }}
                    />
                    {!isExpanded && (
                      <div style={{ textAlign: 'center', marginTop: '-10px', position: 'relative', zIndex: 1, background: 'linear-gradient(transparent, var(--bg-primary))', paddingTop: '20px' }}>
                        <button onClick={() => setExpandedId(sub.participant_id)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}>Xem cả bài</button>
                      </div>
                    )}
                    {isExpanded && (
                      <div style={{ textAlign: 'center', marginTop: '10px' }}>
                        <button onClick={() => setExpandedId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline', marginRight: '15px' }}>Thu gọn</button>
                        <button onClick={() => handleVote(sub.participant_id)} className="btn-primary" style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '0.9rem' }}>👍 Vote bài này</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Dashboard({ username, onPlay, onLogout, onViewMatch, sendMessage, registerHandler }) {
  const [activeTab, setActiveTab] = useState('home')
  const [showDailyQuests, setShowDailyQuests] = useState(false)
  const [activeEvent, setActiveEvent] = useState(null)
  const [activeVotingEvent, setActiveVotingEvent] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0, total: 0, avgScore: 0 })

  const { user } = useUser()

  const [avatarFrame, setAvatarFrame] = useState(localStorage.getItem('kaiko_frame') || 'none')
  const [hasCheckedIn, setHasCheckedIn] = useState(localStorage.getItem('kaiko_checkin_' + username) === new Date().toLocaleDateString('vi-VN'))
  const [extraPoints, setExtraPoints] = useState(parseInt(localStorage.getItem('kaiko_extra_points_' + username) || '0'))
  const [realLevel, setRealLevel] = useState(1)
  const [checkinStreak, setCheckinStreak] = useState(0)

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

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [achievements, setAchievements] = useState([])
  const [fallacyStats, setFallacyStats] = useState({})
  const [mentorData, setMentorData] = useState({ masters: [], disciples: [], requests: [] })
  const [mentorInput, setMentorInput] = useState('')
  const [historyFilter, setHistoryFilter] = useState('all')
  const [opponentFilter, setOpponentFilter] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('all')

  const [activeChatUser, setActiveChatUser] = useState(null)
  const [chatMessages, setChatMessages] = useState({})
  const [chatInput, setChatInput] = useState('')
  const [showChatWidget, setShowChatWidget] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [globalVolume, setGlobalVolume] = useState(() => parseFloat(localStorage.getItem('kaiko_volume') || '1.0'))
  const [camEnabled, setCamEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [chatTab, setChatTab] = useState('friends')   // 'friends' | 'community'
  const [globalMessages, setGlobalMessages] = useState([])
  const [globalInput, setGlobalInput] = useState('')
  const [friendsChatPreview, setFriendsChatPreview] = useState([])
  const [serverAnnouncements, setServerAnnouncements] = useState([])
  const [tickerIdx, setTickerIdx] = useState(0)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [communityPosts, setCommunityPosts] = useState([])
  const [communityInput, setCommunityInput] = useState('')
  const [commentInputs, setCommentInputs] = useState({})
  const [communityLoading, setCommunityLoading] = useState(false)
  const [liveRooms, setLiveRooms] = useState([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [activeSpectatorRoom, setActiveSpectatorRoom] = useState(null)
  const [spectatorEvents, setSpectatorEvents] = useState([])

  // Load server announcements
  useEffect(() => {
    axios.get(`${API_BASE}/server-announcements`).then(r => {
      if (r.data.success) setServerAnnouncements(r.data.announcements)
    }).catch(() => { })
  }, [])

  // Rotate ticker every 6s
  useEffect(() => {
    if (serverAnnouncements.length === 0) return
    const t = setInterval(() => setTickerIdx(i => (i + 1) % serverAnnouncements.length), 6000)
    return () => clearInterval(t)
  }, [serverAnnouncements])

  // Load global chat history
  useEffect(() => {
    axios.get(`${API_BASE}/chat-messages/global`).then(r => {
      if (r.data.success) setGlobalMessages(r.data.messages.map(m => ({ ...m, timestamp: m.timestamp })))
    }).catch(() => { })
  }, [])

  // Load friends chat preview
  const loadFriendsChatPreview = () => {
    if (isGuest) return
    axios.get(`${API_BASE}/chat-friends-preview/${username}`).then(r => {
      if (r.data.success) setFriendsChatPreview(r.data.data)
    }).catch(() => { })
  }

  // Load conversation with a specific friend from DB
  const loadFriendChat = (friend) => {
    axios.get(`${API_BASE}/chat-messages/${friend}?username=${username}`).then(r => {
      if (r.data.success) {
        setChatMessages(prev => ({ ...prev, [friend]: r.data.messages }))
      }
    }).catch(() => { })
  }

  useEffect(() => {
    if (registerHandler) {
      return registerHandler('chat', (data) => {
        if (data.target === 'global') {
          // Skip echo từ chính mình (đã được thêm optimistically trong handleSendGlobal)
          if (data.sender === username) return
          setGlobalMessages(prev => [...prev, { sender: data.sender, text: data.text, timestamp: new Date().toISOString() }])
        } else {
          const key = data.sender === username ? data.target : data.sender
          setChatMessages(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), { sender: data.sender, text: data.text, timestamp: new Date().toISOString() }]
          }))
          if (!showChatWidget || chatTab !== 'friends' || activeChatUser !== key) {
            setChatUnreadCount(c => c + 1)
          }
        }
      })
    }
  }, [registerHandler, showChatWidget, chatTab, activeChatUser, username])

  useEffect(() => {
    if (!registerHandler) return
    const cleanupEvent = registerHandler('spectator_event', (data) => {
      if (!activeSpectatorRoom || data.roomId !== activeSpectatorRoom.roomId) return
      setSpectatorEvents(prev => [...prev.slice(-80), { ...data.event, at: new Date().toISOString() }])
    })
    const cleanupJoined = registerHandler('spectator_joined', (data) => {
      if (data.room) setActiveSpectatorRoom(data.room)
    })
    return () => {
      cleanupEvent?.()
      cleanupJoined?.()
    }
  }, [registerHandler, activeSpectatorRoom])

  const handleSendChat = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeChatUser) return;
    const msg = { type: 'chat', target: activeChatUser, sender: username, text: chatInput.trim() }
    if (sendMessage) sendMessage(msg)
    setChatMessages(prev => ({
      ...prev,
      [activeChatUser]: [...(prev[activeChatUser] || []), { sender: username, text: chatInput.trim(), timestamp: new Date().toISOString() }]
    }))
    setChatInput('')
  }

  const handleSendGlobal = (e) => {
    if (e) e.preventDefault();
    if (!globalInput.trim()) return;
    const msg = { type: 'chat', target: 'global', sender: username, text: globalInput.trim() }
    if (sendMessage) sendMessage(msg)
    setGlobalMessages(prev => [...prev, { sender: username, text: globalInput.trim(), timestamp: new Date().toISOString() }])
    setGlobalInput('')
  }

  const loadCommunityPosts = useCallback(async () => {
    setCommunityLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/community-posts`)
      if (res.data.success) setCommunityPosts(res.data.posts || [])
    } catch (err) {
      console.warn('Không tải được bài cộng đồng:', err.message)
    } finally {
      setCommunityLoading(false)
    }
  }, [])

  const handleCreateCommunityPost = async (e) => {
    e?.preventDefault()
    const content = communityInput.trim()
    if (!content) return
    try {
      const res = await axios.post(`${API_BASE}/community-posts`, { username, content })
      if (res.data.success) {
        setCommunityPosts(prev => [{ ...res.data.post, nickname: globalNicknames[username] || nickname || '', comments: [] }, ...prev])
        setCommunityInput('')
      } else {
        alert(res.data.error || 'Không đăng được bài')
      }
    } catch (err) {
      alert('Lỗi kết nối khi đăng bài')
    }
  }

  const handleLikePost = async (postId) => {
    try {
      const res = await axios.post(`${API_BASE}/community-posts/${postId}/like`)
      if (res.data.success) setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: res.data.likes } : p))
    } catch (err) { }
  }

  const handleCreateComment = async (postId) => {
    const content = (commentInputs[postId] || '').trim()
    if (!content) return
    try {
      const res = await axios.post(`${API_BASE}/community-posts/${postId}/comments`, { username, content })
      if (res.data.success) {
        const comment = { ...res.data.comment, nickname: globalNicknames[username] || nickname || '' }
        setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), comment], comment_count: (p.comment_count || 0) + 1 } : p))
        setCommentInputs(prev => ({ ...prev, [postId]: '' }))
      }
    } catch (err) {
      alert('Lỗi kết nối khi bình luận')
    }
  }

  const loadLiveRooms = useCallback(async () => {
    setLiveLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/live-rooms`)
      if (res.data.success) setLiveRooms(res.data.rooms || [])
    } catch (err) {
      console.warn('Không tải được phòng live:', err.message)
    } finally {
      setLiveLoading(false)
    }
  }, [])

  const handleSpectateRoom = (room) => {
    setActiveSpectatorRoom(room)
    setSpectatorEvents([])
    if (sendMessage) sendMessage({ type: 'spectate_room', roomId: room.roomId })
  }

  // All badge-type items with their image mappings
  const RANK_BADGE_CATALOG = [
    { id: 'rank_1', image: '/assets/badges/crab_baby.png', name: 'Cua Non (Lv 1+)', minLevel: 1 },
    { id: 'rank_11', image: '/assets/badges/crab_walker.png', name: 'Cua Gắt (Lv 11+)', minLevel: 11 },
    { id: 'rank_31', image: '/assets/badges/crab_keyboard.png', name: 'Cua Cùm (Lv 31+)', minLevel: 31 },
    { id: 'rank_61', image: '/assets/badges/crab_judge.png', name: 'Thư Giãn (Lv 61+)', minLevel: 61 },
    { id: 'rank_91', image: '/assets/badges/crab_king.png', name: 'Idol Cua (Lv 91+)', minLevel: 91 },
  ]
  const BADGE_CATALOG = [
    { id: 'title_best', image: '/assets/badges/HHKhoeNhatBien.png', name: 'Khỏe Nhất Biển' },
    { id: 'title_genius', image: '/assets/badges/title_genus.png', name: 'Thiên Tài Tinh Tú' },
    { id: 'title_banthan', image: '/assets/badges/HHBanThan.png', name: 'Bạn Thân Cua' },
    { id: 'title_kaikonew', image: '/assets/badges/HHKaiKoMoiNhu.png', name: 'KaiKo Mới Này' },
    { id: 'rename_card', image: '/assets/badges/rename_card.png', name: 'Thẻ Biệt Danh' },
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
        setAchievements(res.data.achievements || [])
        setUnreadCount(res.data.unread_notifications || 0)
        if (res.data.level_real) setRealLevel(res.data.level_real)
        if (res.data.checkin_streak) setCheckinStreak(res.data.checkin_streak)
        if (res.data.avatar) {
          setSelectedAvatar(res.data.avatar)
          localStorage.setItem('kaiko_avatar_' + username, res.data.avatar)
        }
        if (res.data.frame) {
          setAvatarFrame(res.data.frame)
          localStorage.setItem('kaiko_frame', res.data.frame)
        }
      }
    } catch (e) { }
  }, [username, isGuest])

  const loadEvents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/events`)
      if (res.data.success) setEvents(res.data.events)
    } catch (e) { }
  }, [])

  const loadMyEvents = useCallback(async () => {
    if (isGuest) return
    try {
      const res = await axios.get(`${API_BASE}/my-events/${encodeURIComponent(username)}`)
      if (res.data.success) setJoinedEvents(res.data.events || [])
    } catch (e) { }
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
      } catch (e) {
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
    } catch (e) {
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
    } catch (e) { }
  }

  const handleDeclineRequest = async (requester) => {
    try {
      await axios.post(`${API_BASE}/decline-friend`, { user: username, target: requester })
      loadFriends()
    } catch (e) { }
  }

  const handleRemoveFriend = async (friendName) => {
    if (window.confirm(`Bạn có chắc muốn xóa ${friendName} khỏi danh sách bạn bè?`)) {
      try {
        await axios.post(`${API_BASE}/remove-friend`, { user: username, target: friendName })
        loadFriends()
      } catch (e) { }
    }
  }

  const handleViewUser = async (targetName) => {
    setSelectedUser(targetName)
    setSelectedUserStats(null)
    try {
      const res = await axios.get(`${API_BASE}/history/${encodeURIComponent(targetName)}?limit=1000`)
      if (res.data.success) {
        const h = res.data.history
        const wins = h.filter(m => m.result === 'win').length
        const losses = h.filter(m => m.result === 'lose').length
        const draws = h.filter(m => m.result === 'draw').length
        const exp = wins * 10 + draws * 2 - losses * 2
        const finalExp = Math.max(0, exp)
        const calculatedLevel = Math.floor(finalExp / 100) + 1
        const level = Math.min(calculatedLevel, 101)
        const avgScore = h.length > 0 ? Math.round(h.reduce((acc, m) => acc + m.score_self, 0) / h.length) : 0
        setSelectedUserStats({ wins, losses, draws, total: h.length, level, avgScore, exp: finalExp })
      }
    } catch (e) {
      setSelectedUserStats({ error: true })
    }
  }

  const handleFrameChange = async (e) => {
    const val = e.target.value
    setAvatarFrame(val)
    localStorage.setItem('kaiko_frame', val)
    if (!isGuest) await axios.post(`${API_BASE}/update-profile`, { username, avatar: selectedAvatar, frame: val }).catch(() => { })
  }

  const handleAvatarChange = async (e) => {
    const val = e.target.value
    setSelectedAvatar(val)
    localStorage.setItem('kaiko_avatar_' + username, val)
    if (!isGuest) await axios.post(`${API_BASE}/update-profile`, { username, avatar: val, frame: avatarFrame }).catch(() => { })
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
        const wins = h.filter(m => m.result === 'win').length
        const losses = h.filter(m => m.result === 'lose').length
        const draws = h.filter(m => m.result === 'draw').length
        const avgScore = h.length > 0 ? Math.round(h.reduce((acc, m) => acc + m.score_self, 0) / h.length) : 0

        // Tính toán EXP thực tế (Chat thấp hơn Video)
        // Video/Solo: win=10, draw=2, lose=-2 | Chat: win=7, draw=1, lose=-1
        const exp = h.reduce((acc, m) => {
          const isChat = m.mode?.startsWith('text_')
          if (m.result === 'win') return acc + (isChat ? 7 : 10)
          if (m.result === 'draw') return acc + (isChat ? 1 : 2)
          if (m.result === 'lose') return acc + (isChat ? -1 : -2)
          return acc
        }, 0)
        const finalExp = Math.max(0, exp) // Chỉ điểm kinh nghiệm (Level)
        const calculatedLevel = Math.floor(finalExp / 100) + 1
        const currentExp = finalExp % 100
        // Use realLevel from server if available, otherwise fallback to calculated
        const finalLevel = realLevel > 1 ? realLevel : Math.min(calculatedLevel, 101)
        // Điểm mua sắm cũng phân biệt: Video win=5, Chat win=3
        const shopPoints = h.reduce((acc, m) => {
          const isChat = m.mode?.startsWith('text_')
          if (m.result === 'win') return acc + (isChat ? 3 : 5)
          if (m.result === 'draw') return acc + (isChat ? 0 : 1)
          return acc
        }, 0)
        const points = extraPoints + shopPoints
        setStats({ wins, losses, draws, total: h.length, avgScore, level: finalLevel, exp: currentExp, totalExp: finalExp, points })
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
    } catch (err) { }
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
        .catch(() => { })
    }
  }, [username, isGuest])

  const loadNotifications = useCallback(async () => {
    if (isGuest) return
    try {
      const res = await axios.get(`${API_BASE}/notifications/${encodeURIComponent(username)}`)
      if (res.data.success) {
        setNotifications(res.data.notifications)
      }
    } catch (e) { }
  }, [username, isGuest])

  const loadFallacyStats = useCallback(async () => {
    if (isGuest) return
    try {
      const res = await axios.get(`${API_BASE}/fallacy-stats/${encodeURIComponent(username)}`)
      if (res.data.success) {
        setFallacyStats(res.data.stats)
      }
    } catch (e) { }
  }, [username, isGuest])

  const loadMentorship = useCallback(async () => {
    if (isGuest) return
    try {
      const res = await axios.get(`${API_BASE}/mentorship/${encodeURIComponent(username)}`)
      if (res.data.success) {
        setMentorData({ masters: res.data.masters, disciples: res.data.disciples, requests: res.data.requests || [] })
      }
    } catch (e) { }
  }, [username, isGuest])

  useEffect(() => {
    if (activeTab === 'home' || activeTab === 'history') loadHistory()
    if (activeTab === 'leaderboard') loadLeaderboard()
    if (activeTab === 'friends') loadFriends()
    if (activeTab === 'events') { loadEvents(); loadMyEvents(); }
    if (activeTab === 'store' || activeTab === 'home') loadMyInfo()
    if (activeTab === 'stats') loadFallacyStats()
    if (activeTab === 'mentor') loadMentorship()
    if (activeTab === 'community') loadCommunityPosts()
    if (activeTab === 'live') loadLiveRooms()
  }, [activeTab, loadHistory, loadLeaderboard, loadFriends, loadEvents, loadMyEvents, loadMyInfo, loadFallacyStats, loadMentorship, loadCommunityPosts, loadLiveRooms])

  // Polling for friend requests every 5 seconds
  useEffect(() => {
    if (isGuest) return
    const interval = setInterval(loadFriends, 5000)
    return () => clearInterval(interval)
  }, [loadFriends, isGuest])

  const TABS = [
    { id: 'profile', icon: '👤', label: 'Hồ sơ', color: '#a855f7', image: '/assets/icons/icon_profile.png' },
    { id: 'history', icon: '📋', label: 'Lịch sử', color: '#3b82f6', image: '/assets/icons/icon_history.png' },
    { id: 'leaderboard', icon: '🏆', label: 'BXH', color: '#f59e0b', image: '/assets/icons/icon_leaderboard.png' },
    { id: 'friends', icon: '👥', label: 'Bạn bè', color: '#10b981', image: '/assets/icons/icon_friends.png' },
    { id: 'events', icon: '🎉', label: 'Sự kiện', color: '#ec4899', image: '/assets/icons/icon_events.png' },
    { id: 'store', icon: '🛒', label: 'Cửa hàng', color: '#eab308', image: '/assets/icons/icon_store.png' },
    { id: 'stats', icon: '📊', label: 'Thống Kê', color: '#ef4444', image: '/assets/icons/icon_stats.png' },
    { id: 'mentor', icon: '🎓', label: 'Bái Sư', color: '#8b5cf6', image: '/assets/icons/icon_mentor.png' },
    { id: 'community', icon: '🌐', label: 'Cộng Đồng', color: '#14b8a6', image: '/assets/icons/icon_community.png' },
    { id: 'live', icon: '📺', label: 'Xem Live', color: '#ef4444', image: '/assets/icons/icon_live.png' },
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

  // Rarity helper for rank
  const getRarityClass = (level) => {
    if (level >= 91) return 'rarity-legendary'
    if (level >= 61) return 'rarity-epic'
    if (level >= 31) return 'rarity-rare'
    if (level >= 11) return 'rarity-rare'
    return 'rarity-common'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '0.5rem', width: '100%', maxWidth: '1800px', margin: '0 auto', boxSizing: 'border-box' }}>

      {/* ── Server Ticker ── */}
      {serverAnnouncements.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15), rgba(99,102,241,0.15))',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '8px',
          padding: '6px 16px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflow: 'hidden',
          height: '34px'
        }}>
          <span style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0, letterSpacing: '1px' }}>📢 SERVER</span>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div key={tickerIdx} style={{
              color: '#e2e8f0',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              animation: 'tickerSlide 0.5s ease',
            }}>
              {serverAnnouncements[tickerIdx]}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {serverAnnouncements.map((_, i) => (
              <div key={i} onClick={() => setTickerIdx(i)} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === tickerIdx ? '#a78bfa' : 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Header with Avatar + EXP Bar ── */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 2rem', marginBottom: '1rem', gap: '20px' }}>
        {/* Left: Avatar + Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          {/* Avatar circle with glow */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: rank.bg,
              border: `3px solid ${rank.color}`,
              boxShadow: `0 0 18px ${rank.color}60`,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'avatarGlow 3s ease-in-out infinite'
            }}>
              <img src={avatarUrl} alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
              />
            </div>
            {avatarFrame !== 'none' && (
              <img src={`/assets/frames/${frameFileMap[avatarFrame] || avatarFrame + '.png'}`}
                alt="frame" style={{ position: 'absolute', top: '-18%', left: '-18%', width: '136%', height: '136%', pointerEvents: 'none', zIndex: 10 }}
                onError={e => { e.target.style.display = 'none' }} />
            )}
            {/* Level badge */}
            <div style={{
              position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)',
              background: rank.color, color: '#fff', borderRadius: 'var(--radius-full)',
              fontSize: '0.65rem', fontWeight: '800', padding: '1px 7px',
              fontFamily: 'var(--font-heading)', letterSpacing: '0.05em', whiteSpace: 'nowrap',
              boxShadow: `0 2px 8px ${rank.color}80`
            }}>LV {currentLevel}</div>
          </div>

          {/* Name + rank + EXP bar */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                {getDisplayName(username)}
              </span>
              <span style={{
                background: rank.bg, color: rank.color, padding: '2px 10px',
                borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: '700',
                border: `1px solid ${rank.color}60`, display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                {rank.icon} {rank.title}
              </span>
              {!isGuest && (
                <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: '700' }}>
                  ⭐ {serverPoints} pts
                </span>
              )}
              {/* === WIN/LOSS MOVED HERE === */}
              {!isGuest && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: '#10b981', fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '0.9rem' }}>🏆 {stats.wins || 0}W</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '0.75rem' }}>vs</span>
                  <span style={{ color: '#ef4444', fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '0.9rem' }}>{stats.losses || 0}L 💔</span>
                  {checkinStreak > 0 && <span style={{ color: '#f59e0b', fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '0.9rem', marginLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px' }}>🔥 {checkinStreak} ngày</span>}
                </div>
              )}
            </div>
            {/* EXP Progress Bar */}
            {!isGuest && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', fontFamily: 'var(--font-heading)' }}>EXP</span>
                <div className="exp-bar-track" style={{ flex: 1, height: '12px' }}>
                  <div className="exp-bar-fill" style={{ width: `${stats.exp || 0}%` }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: rank.color, fontWeight: '700', whiteSpace: 'nowrap', fontFamily: 'var(--font-heading)' }}>
                  {stats.exp || 0}<span style={{ opacity: 0.6 }}>/100</span>
                </span>
              </div>
            )}
            {isGuest && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>🔒 Khách — Đăng nhập để lưu tiến trình!</p>
            )}

            {/* Action Buttons: Quest and Check-in */}
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div
                onClick={() => setShowDailyQuests(true)}
                style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '2px double #78350f',
                  borderRadius: '12px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(245,158,11,0.3)',
                  transition: 'transform 0.25s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span style={{ fontSize: '1.2rem' }}>📜</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '0.8rem', color: '#78350f', letterSpacing: '0.04em' }}>
                  NHIỆM VỤ HÀNG NGÀY
                </span>
              </div>
              
              <button
                onClick={handleCheckIn}
                disabled={hasCheckedIn}
                style={{
                  background: hasCheckedIn ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg, #f97316, #f59e0b)',
                  color: hasCheckedIn ? '#10b981' : '#fff',
                  border: hasCheckedIn ? '1px solid rgba(16,185,129,0.4)' : '2px solid rgba(255,255,255,0.4)',
                  borderRadius: '12px', padding: '6px 16px',
                  cursor: hasCheckedIn ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '0.85rem',
                  boxShadow: hasCheckedIn ? 'none' : '0 4px 10px rgba(245,158,11,0.3)',
                  transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if(!hasCheckedIn) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { if(!hasCheckedIn) e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <span style={{ fontSize: '1.2rem' }}>{hasCheckedIn ? '✅' : '🎁'}</span>
                <span>{hasCheckedIn ? 'ĐÃ ĐIỂM DANH' : 'ĐIỂM DANH NHẬN QUÀ'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Logout & Notifications */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); loadNotifications(); }}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', position: 'relative' }}
            >
              🔔
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)' }}>
                  {unreadCount}
                </div>
              )}
            </button>


          </div>

          <button
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: 'var(--radius-full)', cursor: 'pointer', transition: 'all 0.25s ease', flexShrink: 0, fontFamily: 'var(--font-heading)' }}
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
          padding: '1rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Lớp nền con lồng bên trong */}
          <div style={{
            background: activeTab === 'home' ? 'transparent' : 'rgba(0, 0, 0, 0.3)',
            borderRadius: '20px',
            padding: activeTab === 'home' ? '0' : '1rem',
            border: activeTab === 'home' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: activeTab === 'home' ? 'visible' : 'auto',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '0.5rem' }}>

                {/* ── Row 1: Hero Play Zone ── */}
                <div style={{
                  position: 'relative', textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(180,70,10,0.22) 0%, rgba(245,158,11,0.14) 50%, rgba(239,68,68,0.18) 100%)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: '20px', padding: '0.8rem 1.5rem',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {/* Corner decorations */}
                  <span style={{ position: 'absolute', top: 8, left: 12, color: 'rgba(245,158,11,0.6)', fontSize: '1.1rem', userSelect: 'none' }}>◈</span>
                  <span style={{ position: 'absolute', top: 8, right: 12, color: 'rgba(245,158,11,0.6)', fontSize: '1.1rem', userSelect: 'none' }}>◈</span>
                  <span style={{ position: 'absolute', bottom: 8, left: 12, color: 'rgba(245,158,11,0.6)', fontSize: '1.1rem', userSelect: 'none' }}>◈</span>
                  <span style={{ position: 'absolute', bottom: 8, right: 12, color: 'rgba(245,158,11,0.6)', fontSize: '1.1rem', userSelect: 'none' }}>◈</span>
                  
                  {/* Ambient glow behind button */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '280px', height: '80px', background: 'radial-gradient(ellipse, rgba(239,68,68,0.35), transparent 70%)', pointerEvents: 'none', filter: 'blur(20px)' }} />
                  
                  <button
                    onClick={onPlay}
                    className="btn-primary play-btn-ring"
                    style={{
                      padding: '12px 60px', fontSize: '1.5rem', borderRadius: 'var(--radius-full)',
                      letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)',
                      boxShadow: '0 0 40px rgba(239,68,68,0.5), 0 8px 32px rgba(245,158,11,0.3)',
                      position: 'relative', zIndex: 1
                    }}
                  >
                    CHƠI NGAY
                  </button>
                </div>

                {/* ── Divider ── */}
                <div style={{ width: '60%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)', margin: '0.4rem auto' }} />

                {/* ── Row 2: Nav Grid ── */}
                <div style={{ zoom: 0.65, display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '0.8rem' }}>
                  
                  {/* Left Column: Profile Card + Scroll Quest Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', height: '100%' }}>
                    {/* Profile card — tall */}
                    {(() => {
                      const profileTab = TABS.find(t => t.id === 'profile')
                      return (
                        <div
                          className="nav-card"
                          onClick={() => setActiveTab('profile')}
                          style={{
                            background: 'transparent',
                            borderRadius: '20px', padding: '1rem',
                            cursor: 'pointer', textAlign: 'center',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '8px', flex: 1
                          }}
                        >
                          {profileTab.image
                            ? <img src={profileTab.image} alt={profileTab.label}
                                style={{ width: '11rem', height: '11rem', objectFit: 'contain', filter: `drop-shadow(0 4px 14px ${profileTab.color}90)` }}
                                onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block') }} />
                            : null
                          }
                          <div className="nav-card-icon" style={{ fontSize: '9rem', filter: `drop-shadow(0 4px 12px ${profileTab.color}70)`, display: profileTab.image ? 'none' : 'block' }}>{profileTab.icon}</div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '1.1rem', color: '#f59e0b', letterSpacing: '0.04em' }}>{profileTab.label.toUpperCase()}</div>
                          {!isGuest && (
                            <div style={{ background: `${profileTab.color}20`, borderRadius: 'var(--radius-full)', padding: '4px 16px', fontSize: '1rem', color: profileTab.color, fontWeight: '700', fontFamily: 'var(--font-heading)', border: `1px solid ${profileTab.color}40` }}>
                              LV {currentLevel}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Right Column: Grid of other tabs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                    {TABS.filter(t => t.id !== 'profile').map((tab) => (
                      <div
                        key={tab.id}
                        className="nav-card"
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          background: 'transparent',
                          borderRadius: '14px',
                          cursor: 'pointer', textAlign: 'center',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: '8px', padding: '0.6rem',
                        }}
                      >
                        {tab.image
                          ? <img src={tab.image} alt={tab.label} className="nav-card-icon"
                              style={{ width: '8.5rem', height: '8.5rem', objectFit: 'contain', filter: `drop-shadow(0 3px 10px ${tab.color}80)` }}
                              onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block') }} />
                          : null
                        }
                        <div className="nav-card-icon" style={{ fontSize: '7rem', lineHeight: 1, filter: `drop-shadow(0 3px 8px ${tab.color}70)`, display: tab.image ? 'none' : 'block' }}>{tab.icon}</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '1rem', color: '#f59e0b', letterSpacing: '0.04em', lineHeight: 1.2 }}>{tab.label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>

                </div>



                {false && (
                  <div style={{

                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',


                    backdropFilter: 'blur(4px)'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      border: '8px double #78350f',
                      borderRadius: '20px',
                      padding: '2rem',
                      width: '90%',
                      maxWidth: '420px',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(120,53,15,0.15)',
                      position: 'relative',
                      color: '#78350f',
                      fontFamily: 'var(--font-heading)'
                    }}>
                      {/* Decorative Scroll Handles */}
                      <div style={{
                        position: 'absolute', top: '-15px', left: '8%', right: '8%',
                        height: '10px', background: '#78350f', borderRadius: '5px'
                      }} />
                      <div style={{
                        position: 'absolute', bottom: '-15px', left: '8%', right: '8%',
                        height: '10px', background: '#78350f', borderRadius: '5px'
                      }} />

                      <h3 style={{
                        textAlign: 'center', margin: '0 0 1.5rem',
                        fontSize: '1.3rem', fontWeight: '900',
                        letterSpacing: '2px', borderBottom: '2px dashed #78350f',
                        paddingBottom: '0.5rem'
                      }}>
                        📜 CUỘN GIẤY NHIỆM VỤ
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
                        {[
                          { label: 'Thắng 3 trận đấu', reward: '+200 EXP', done: (stats.wins || 0) >= 3 },
                          { label: 'Điểm danh ngày hôm nay', reward: '+50 pts', done: hasCheckedIn },
                        ].map((q, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              opacity: q.done ? 0.45 : 1,
                              transition: 'opacity 0.25s',
                              fontSize: '0.95rem',
                              fontWeight: '700'
                            }}
                          >
                            {/* Custom Checkbox */}
                            <div style={{
                              width: '22px',
                              height: '22px',
                              border: '2.5px solid #78350f',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: '900',
                              color: '#78350f',
                              background: q.done ? 'rgba(120,53,15,0.1)' : 'transparent',
                              flexShrink: 0
                            }}>
                              {q.done && '✓'}
                            </div>
                            
                            {/* Quest Text */}
                            <div style={{ flex: 1 }}>
                              <div>{q.label}</div>
                              <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: '600' }}>
                                Phần thưởng: <span style={{ color: '#c2410c' }}>{q.reward}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowDailyQuests(false)}
                        style={{
                          width: '100%',
                          padding: '10px 0',
                          background: '#78350f',
                          color: '#fef3c7',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          letterSpacing: '1px',
                          fontFamily: 'var(--font-heading)',
                          boxShadow: '0 4px 10px rgba(120,53,15,0.3)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#92400e'}
                        onMouseLeave={e => e.currentTarget.style.background = '#78350f'}
                      >
                        ĐÓNG CUỘN GIẤY
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* HISTORY */}
            {activeTab === 'history' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
                  <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>📋 Lịch sử trận đấu</h2>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Tìm tên đối thủ..."
                      value={opponentFilter}
                      onChange={e => setOpponentFilter(e.target.value)}
                      style={{ padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.9rem', outline: 'none', maxWidth: '150px' }}
                    />
                    <select
                      value={visibilityFilter}
                      onChange={e => setVisibilityFilter(e.target.value)}
                      style={{ padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      <option value="all">Mọi quyền</option>
                      <option value="public">Công khai</option>
                      <option value="private">Riêng tư</option>
                    </select>
                    <select
                      value={historyFilter}
                      onChange={e => setHistoryFilter(e.target.value)}
                      style={{ padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      <option value="all">Tất cả loại</option>
                      <option value="video">🎥 Video Debate</option>
                      <option value="chat">💬 Chat Debate</option>
                      <option value="solo_ai">🤖 Solo AI</option>
                    </select>
                    {!isGuest && (
                      <button onClick={loadHistory} style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-full)', padding: '8px 18px', cursor: 'pointer', fontSize: '0.9rem' }}>
                        🔄 Làm mới
                      </button>
                    )}
                  </div>
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

                    {history.filter(m => {
                      let pass = true;
                      if (historyFilter === 'chat' && !m.mode?.startsWith('text_')) pass = false;
                      if (historyFilter === 'video' && (m.mode?.startsWith('text_') || m.mode === 'solo_ai')) pass = false;
                      if (historyFilter === 'solo_ai' && m.mode !== 'solo_ai') pass = false;
                      if (opponentFilter.trim() !== '' && !m.opponent?.toLowerCase().includes(opponentFilter.toLowerCase())) pass = false;
                      // DB doesnt save visibility yet, but mock support for future:
                      if (visibilityFilter !== 'all' && m.visibility && m.visibility !== visibilityFilter) pass = false;
                      return pass;
                    }).map(m => <HistoryRow key={m.id} match={m} onClick={() => onViewMatch(m)} />)}
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
                    <select value={selectedAvatar} onChange={handleAvatarChange} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
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
                      <img src={rank.badgeImage} alt="Rank Badge" style={{ height: '140px', width: 'auto', maxWidth: '350px', objectFit: 'contain', filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.4))' }} onError={(e) => { e.target.style.display = 'none' }} />
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
                              <img src={b.image} alt={b.name} style={{ height: '96px', width: '96px', objectFit: 'contain', filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.5))' }} onError={(e) => { e.target.style.display = 'none' }} />
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
                      { label: 'Chiến thắng', value: stats.wins, color: '#10b981', icon: '🏆' },
                      { label: 'Thất bại', value: stats.losses, color: '#ef4444', icon: '💔' },
                      { label: 'Điểm TB', value: stats.avgScore, color: '#f59e0b', icon: '⭐' },
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

                {/* ACHIEVEMENTS */}
                {!isGuest && achievements.length > 0 && (
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(16,185,129,0.05)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <h3 style={{ margin: '0 0 1rem', color: '#10b981' }}>🏆 Thành Tích Đạt Được</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                      {achievements.includes('first_win') && <span style={{ padding: '5px 12px', background: 'rgba(16,185,129,0.2)', color: '#10b981', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>⭐ Chiến thắng đầu tiên</span>}
                      {achievements.includes('win_10') && <span style={{ padding: '5px 12px', background: 'rgba(59,130,246,0.2)', color: '#3b82f6', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>🌟 10 Trận Thắng</span>}
                      {achievements.includes('perfect_logic') && <span style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>🔥 Hoàn Mỹ Logic</span>}
                      {achievements.includes('perfect_score') && <span style={{ padding: '5px 12px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>💯 100 Điểm</span>}
                    </div>
                  </div>
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
                          <button onClick={() => setActiveChatUser(fname)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>
                            💬 Chat
                          </button>
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
                                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                                  <button
                                    className={hasJoined || (isOpen && !hasJoined) ? 'btn-primary' : 'btn-secondary'}
                                    disabled={(!isOpen && !hasJoined)}
                                    onClick={() => {
                                      if (hasJoined) setActiveEvent(ev)
                                      else if (isOpen) handleJoinEvent(ev.id, ev.title)
                                    }}
                                    style={{ flex: 1, opacity: (isOpen || hasJoined) ? 1 : 0.5, cursor: (isOpen || hasJoined) ? 'pointer' : 'not-allowed', background: hasJoined ? '#10b981' : '', color: hasJoined ? '#fff' : '' }}
                                  >
                                    {hasJoined ? '📝 Sửa Bài' : isOpen ? 'Tham gia' : isUpcoming ? 'Chưa mở' : 'Đã đóng'}
                                  </button>
                                  <button
                                    className={isOpen ? "btn-secondary" : "btn-secondary disabled"}
                                    disabled={!isOpen}
                                    onClick={() => setActiveVotingEvent(ev)}
                                    style={{ flex: 1, border: '1px solid #fbbf24', color: '#fbbf24', opacity: isOpen ? 1 : 0.5, cursor: isOpen ? 'pointer' : 'not-allowed' }}
                                  >
                                    {isOpen ? '👍 Bình chọn' : '🔒 Đóng bình chọn'}
                                  </button>
                                </div>
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
                          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🔒</div>
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
                              <img src="/assets/mascots/CuaMa.png" alt="Cua Ma" style={{ width: '100px', height: '100px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
                              <div style={{ display: 'none' }}>👻</div>
                            </div>
                            <h3 style={{ color: '#8b5cf6' }}>Phe Cua Ma</h3>
                          </div>
                          <div style={{ background: 'rgba(234,179,8,0.1)', border: '2px solid #eab308', borderRadius: '20px', padding: '2rem' }}>
                            <div style={{ fontSize: '5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                              <img src="/assets/mascots/CuaThan.png" alt="Cua Thần" style={{ width: '100px', height: '100px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
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
                        <div style={{ fontSize: '4.4rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', height: '80px' }}>
                          <img src={item.isFrame ? `/assets/frames/${item.image}` : `/assets/badges/${item.image}`} alt={item.name} style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block' }} />
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
                            } catch (e) { alert('Lỗi kết nối!') }
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

            {/* CÀI ĐẶT UNIFIED */}
            {activeTab === 'settings' && (
              <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', paddingBottom: '3rem' }}>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '2rem', textAlign: 'center' }}>Cài đặt</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  
                  {/* Account Info & Nickname */}
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                    <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 Tài Khoản</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>Tên đăng nhập:</p>
                    <input type="text" value={username} readOnly className="glass-input" style={{ padding: '12px', width: '100%', boxSizing: 'border-box', marginBottom: '16px', background: 'rgba(0,0,0,0.2)' }} />
                    {isGuest && <p style={{ color: '#f59e0b', fontSize: '0.85rem', margin: '-10px 0 16px' }}>⚠️ Tài khoản khách — lịch sử không được lưu.</p>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ color: 'var(--text-secondary)' }}>Biệt danh (Nickname)</label>
                      <span style={{ color: globalNicknames[username] ? '#ef4444' : '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {globalNicknames[username] ? '0 Thẻ Đổi Tên' : 'Miễn phí lần đầu (1 Thẻ)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Nhập biệt danh..."
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem' }}
                      />
                      <button
                        onClick={async () => {
                          try {
                            const res = await axios.post(`${API_BASE}/set-nickname`, { username, nickname });
                            if (res.data.success) {
                              localStorage.setItem('kaiko_nickname_' + username, nickname);
                              setGlobalNicknames(prev => ({ ...prev, [username]: nickname }));
                              alert('Đã lưu biệt danh thành công!');
                              loadMyInfo(); 
                            } else {
                              alert('Lỗi: ' + res.data.error);
                            }
                          } catch (e) {
                            alert('Lỗi kết nối server!');
                          }
                        }}
                        className="btn-primary"
                        style={{ padding: '0 16px', opacity: isGuest ? 0.5 : 1, pointerEvents: isGuest ? 'none' : 'auto' }}
                      >
                        Lưu
                      </button>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '10px', lineHeight: 1.4 }}>
                      Nếu bạn đã đặt tên, việc đổi tên sẽ tiêu hao 1 Thẻ Đổi Nickname (mua trong Cửa Hàng).
                    </p>
                  </div>

                  {/* Password Management */}
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                    <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🔒 Đổi Mật Khẩu</h3>
                    {!isGuest ? (
                      <>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Mật khẩu hiện tại</label>
                        <input
                          type="password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="Nhập mật khẩu cũ..."
                          className="glass-input"
                          style={{ padding: '12px', width: '100%', boxSizing: 'border-box', marginBottom: '16px' }}
                        />
                        <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Mật khẩu mới</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nhập mật khẩu mới..."
                          className="glass-input"
                          style={{ padding: '12px', width: '100%', boxSizing: 'border-box', marginBottom: '16px' }}
                        />
                        <button
                          onClick={async () => {
                            if (!oldPassword || !newPassword) return alert("Vui lòng điền đủ thông tin.");
                            try {
                              const res = await axios.post(`${API_BASE}/change-password`, { username, old_password: oldPassword, new_password: newPassword });
                              if (res.data.success) {
                                alert("Đổi mật khẩu thành công!");
                                setOldPassword('');
                                setNewPassword('');
                              } else {
                                alert("Lỗi: " + res.data.error);
                              }
                            } catch (e) {
                              alert("Lỗi kết nối!");
                            }
                          }}
                          className="btn-primary"
                          style={{ width: '100%' }}
                        >
                          Xác Nhận Đổi
                        </button>
                      </>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Tài khoản khách không thể đổi mật khẩu.</p>
                    )}
                  </div>

                  {/* Device & Permissions */}
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                    <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🎙️ Thiết Bị & Âm Thanh</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>Camera & Mic</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {camEnabled ? 'Đã cấp quyền' : 'Chưa cấp quyền'}
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          if (!camEnabled) {
                            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                              .then(() => { setCamEnabled(true); setMicEnabled(true); alert('✅ Cấp quyền thành công!') })
                              .catch(() => alert('❌ Bị từ chối. Vui lòng kiểm tra cài đặt trình duyệt.'));
                          } else {
                            setCamEnabled(false);
                            setMicEnabled(false);
                          }
                        }}
                        style={{
                          width: '54px', height: '30px', borderRadius: '15px',
                          background: camEnabled ? '#10b981' : '#ef4444',
                          position: 'relative', cursor: 'pointer',
                          transition: 'background 0.3s', flexShrink: 0
                        }}
                      >
                        <div style={{
                          width: '26px', height: '26px', borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: '2px',
                          left: camEnabled ? '26px' : '2px',
                          transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>


                    {/* Audio Volume Slider */}
                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold' }}>Âm Lượng Tổng</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{Math.round(globalVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05" 
                        value={globalVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setGlobalVolume(val);
                          localStorage.setItem('kaiko_volume', val);
                          document.querySelectorAll('audio, video').forEach(el => { el.volume = val; });
                        }}
                        style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                      />
                    </div>
                  </div>


                </div>
              </div>
            )}

            {/* THỐNG KÊ NGỤY BIỆN */}
            {activeTab === 'stats' && (
              <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '1rem', textAlign: 'center' }}>📊 Phân Tích Ngụy Biện</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem' }}>Thống kê các lỗi logic bạn thường gặp trong các cuộc tranh biện.</p>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  {Object.keys(fallacyStats).length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                      Tuyệt vời! Bạn chưa mắc lỗi ngụy biện nào.
                    </div>
                  ) : (
                    <div>
                      {Object.entries(fallacyStats).sort((a, b) => b[1] - a[1]).map(([fallacy, count]) => (
                        <div key={fallacy} style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 5px 0', color: '#ef4444' }}>{fallacy}</h4>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Bạn đã mắc lỗi này <strong style={{ color: '#fff' }}>{count} lần</strong>. Hãy chú ý hơn trong lập luận!</div>
                          </div>
                          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444', opacity: 0.8 }}>{count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HỆ THỐNG BÁI SƯ */}
            {activeTab === 'mentor' && (
              <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '1rem', textAlign: 'center' }}>🎓 Hệ Thống Bái Sư</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Xin Bái Sư */}
                  <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                    <h3 style={{ marginTop: 0, color: '#8b5cf6' }}>🤝 Xin Bái Sư</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Tìm sư phụ giỏi hơn để học hỏi kinh nghiệm. Hai người có thể thi đấu với nhau để nhận quà.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Nhập tên sư phụ..."
                        value={mentorInput}
                        onChange={e => setMentorInput(e.target.value)}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                      />
                      <button
                        onClick={async () => {
                          if (!mentorInput.trim()) return;
                          try {
                            const res = await axios.post(`${API_BASE}/mentorship/request`, { master: mentorInput.trim(), disciple: username });
                            if (res.data.success) { alert('Đã gửi lời bái sư!'); setMentorInput(''); }
                            else alert(res.data.error);
                          } catch (e) { alert('Lỗi kết nối'); }
                        }}
                        style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Gửi
                      </button>
                    </div>
                  </div>

                  {/* Tình Trạng */}
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>📜 Môn Phái</h3>
                    <div style={{ marginBottom: '1rem' }}>
                      <strong style={{ color: '#f59e0b' }}>Sư Phụ của bạn:</strong>
                      {mentorData.masters.length === 0 ? <div style={{ color: 'var(--text-secondary)' }}>Chưa có sư phụ</div> :
                        mentorData.masters.map(m => <div key={m.id} style={{ color: '#fff', marginTop: '5px' }}>👑 {m.master} {m.is_graduated ? '(Đã Xuất Sư)' : ''}</div>)
                      }
                    </div>
                    <div>
                      <strong style={{ color: '#10b981' }}>Đệ Tử của bạn:</strong>
                      {mentorData.disciples.length === 0 ? <div style={{ color: 'var(--text-secondary)' }}>Chưa có đệ tử</div> :
                        mentorData.disciples.map(d => <div key={d.id} style={{ color: '#fff', marginTop: '5px' }}>👶 {d.disciple} {d.is_graduated ? '(Đã Xuất Sư)' : ''}</div>)
                      }
                    </div>
                    {mentorData.requests && mentorData.requests.length > 0 && (
                      <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <strong style={{ color: '#ef4444' }}>Yêu Cầu Bái Sư:</strong>
                        {mentorData.requests.map(reqDisciple => (
                          <div key={reqDisciple} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginTop: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <span style={{ color: '#fff' }}>👶 {reqDisciple}</span>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button onClick={async () => {
                                try {
                                  await axios.post(`${API_BASE}/mentorship/accept`, { master: username, disciple: reqDisciple });
                                  loadMentorship();
                                } catch (e) { }
                              }} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Nhận</button>
                              <button onClick={async () => {
                                try {
                                  await axios.post(`${API_BASE}/mentorship/decline`, { master: username, disciple: reqDisciple });
                                  loadMentorship();
                                } catch (e) { }
                              }} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Từ chối</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CÁC TAB KHÁC CHƯA CÓ NỘI DUNG */}
            {['unknown_tab', 'guide'].includes(activeTab) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '5rem', marginBottom: '1rem', filter: 'grayscale(1)' }}>🚧</div>
                <h2>Tính năng đang phát triển</h2>
                <p>Mục này sẽ sớm ra mắt trong các bản cập nhật tới!</p>
              </div>
            )}

            {/* LIVE TAB */}
            {activeTab === 'live' && (
              <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <h2 style={{ color: 'var(--accent-primary)', margin: 0, fontSize: '2rem' }}>📺 Xem Live Debate</h2>
                  <button onClick={loadLiveRooms} className="btn-secondary" style={{ padding: '10px 18px', borderRadius: '8px' }}>Tải lại</button>
                </div>
                {liveLoading ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Đang tải phòng live...</p>
                ) : liveRooms.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '3rem', borderRadius: '16px', textAlign: 'center', border: '1px dashed var(--border-light)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '1rem' }}>Chưa có phòng nào đang thi đấu.</p>
                    <p style={{ color: 'var(--text-secondary)' }}>Các trận rank và trận level cao sẽ hiện ở đây khi có đủ 2 người chơi.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {liveRooms.map(room => (
                      <div key={room.roomId} style={{ background: room.isHighLevel ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${room.isHighLevel ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                          <strong style={{ color: room.isHighLevel ? '#f87171' : 'var(--text-primary)' }}>{room.isHighLevel ? 'Trận cấp cao' : 'Live'}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{room.spectators} đang xem</span>
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '700', lineHeight: 1.35 }}>{room.topic}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{room.players.map(p => `${p.name} Lv.${p.level}`).join(' vs ')}</div>
                        <button onClick={() => handleSpectateRoom(room)} className="btn-primary" style={{ padding: '10px 14px', borderRadius: '8px', alignSelf: 'flex-start' }}>Vào xem</button>
                      </div>
                    ))}
                  </div>
                )}
                {activeSpectatorRoom && (
                  <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{activeSpectatorRoom.topic}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{activeSpectatorRoom.players?.map(p => p.name).join(' vs ')}</div>
                      </div>
                      <button onClick={() => { setActiveSpectatorRoom(null); setSpectatorEvents([]) }} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.5)', color: '#ef4444', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>Đóng</button>
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {spectatorEvents.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Đang chờ tín hiệu live từ phòng...</p>
                      ) : spectatorEvents.map((ev, idx) => {
                        const label = ev.type === 'transcript_update' ? `Lượt ${ev.player}` : ev.type === 'chat_msg' ? `Chat ${ev.msg?.speaker}` : ev.type === 'fallacy_detected' ? 'Ngụy biện' : ev.type === 'emoji_react' ? 'Reaction' : ev.type
                        const text = ev.type === 'transcript_update' ? ev.text : ev.type === 'chat_msg' ? ev.msg?.text : ev.type === 'fallacy_detected' ? `${ev.speaker}: ${ev.fallacy}` : ev.type === 'emoji_react' ? ev.emoji : 'Trận đấu đã kết thúc'
                        return (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ color: '#a5b4fc', fontWeight: '700', fontSize: '0.78rem', marginBottom: '4px' }}>{label}</div>
                            <div style={{ color: 'var(--text-primary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{text}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMMUNITY TAB */}
            {activeTab === 'community' && (
              <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <h2 style={{ color: 'var(--accent-primary)', margin: 0, fontSize: '2rem' }}>Diễn Đàn Cộng Đồng</h2>
                  <button onClick={loadCommunityPosts} className="btn-secondary" style={{ padding: '10px 18px', borderRadius: '8px' }}>Tải lại tin mới</button>
                </div>
                <form onSubmit={handleCreateCommunityPost} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea value={communityInput} onChange={e => setCommunityInput(e.target.value)} maxLength={1000} placeholder="Chia sẻ kinh nghiệm tranh biện, hỏi chiến thuật, hoặc đăng chủ đề muốn cộng đồng bàn luận..." style={{ minHeight: '94px', resize: 'vertical', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '12px', outline: 'none', fontSize: '1rem', lineHeight: 1.45 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{communityInput.length}/1000</span>
                    <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>Đăng bài</button>
                  </div>
                </form>
                {communityLoading ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Đang tải bài viết...</p>
                ) : communityPosts.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', textAlign: 'center', border: '1px dashed var(--border-light)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Chưa có bài viết nào. Hãy mở màn diễn đàn.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {communityPosts.map(post => (
                      <div key={post.id} style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{post.nickname || getDisplayName(post.username)}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(post.created_at + 'Z').toLocaleString('vi-VN')}</div>
                          </div>
                          <button onClick={() => handleLikePost(post.id)} style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', padding: '6px 12px', cursor: 'pointer', height: 'fit-content' }}>♥ {post.likes || 0}</button>
                        </div>
                        <div style={{ color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: '12px' }}>{post.content}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                          {(post.comments || []).map(comment => (
                            <div key={comment.id} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '8px', padding: '8px 10px' }}>
                              <span style={{ color: '#a5b4fc', fontWeight: '700' }}>{comment.nickname || getDisplayName(comment.username)}: </span>
                              <span style={{ color: 'var(--text-primary)' }}>{comment.content}</span>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input value={commentInputs[post.id] || ''} onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleCreateComment(post.id) }} placeholder="Viết bình luận..." style={{ flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '10px 12px', outline: 'none' }} />
                            <button onClick={() => handleCreateComment(post.id)} className="btn-secondary" style={{ padding: '8px 14px', borderRadius: '8px' }}>Gửi</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  {(() => {
                    const isHidden = selectedUser !== username && stats.level < selectedUserStats.level;
                    if (isHidden) {
                      return (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌫️</div>
                          <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Tu Vi Cảnh Giới Quá Cao</div>
                          <div style={{ color: 'var(--text-secondary)' }}>Không thể nhìn thấu đạo hạnh của vị đạo hữu này!</div>
                          <div style={{ marginTop: '15px', color: '#f59e0b', fontSize: '0.9rem' }}>Bạn cần đạt cấp độ tương đương hoặc cao hơn để xem thông tin.</div>
                        </div>
                      )
                    }

                    return (
                      <>
                        {(() => {
                          const showcase = selectedUserStats.showcaseBadges || [];
                          if (showcase.length > 0) {
                            try {
                              const badgeObjs = showcase.map(id => [...RANK_BADGE_CATALOG, ...BADGE_CATALOG].find(b => b.id === id)).filter(Boolean)
                              return (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                  {badgeObjs.map(b => (
                                    <div key={b.id} title={b.name} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', padding: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                      <img src={b.image} alt={b.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
                                    </div>
                                  ))}
                                </div>
                              )
                            } catch { }
                          }

                          // Nếu không có huy hiệu showcase thì hiện huy hiệu rank mặc định
                          return (
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                              <img src={getRankInfo(selectedUserStats.level).badgeImage} alt="Rank Badge" style={{ height: '90px', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))' }} onError={(e) => { e.target.style.display = 'none' }} />
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
                    )
                  })()}
                  {selectedUser !== username && !isGuest && (
                    <div style={{ marginTop: '20px' }}>
                      <button
                        onClick={async () => {
                          try {
                            const res = await axios.post(`${API_BASE}/mentorship/request`, { master: selectedUser, disciple: username });
                            if (res.data.success) { alert('Đã gửi lời bái sư!'); }
                            else { alert(res.data.error); }
                          } catch (e) { alert('Lỗi kết nối'); }
                        }}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        🎓 Xin Bái Sư
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeEvent && <EventWorkspaceModal event={activeEvent} onClose={() => setActiveEvent(null)} username={username} />}
      {activeVotingEvent && <EventVotingModal event={activeVotingEvent} username={username} onClose={() => setActiveVotingEvent(null)} />}

      {/* === CHAT WIDGET === */}
      {showChatWidget && (
        <div style={{ position: 'fixed', bottom: '90px', right: '90px', width: '360px', height: '500px', background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(24px)', borderRadius: '20px', border: '1px solid rgba(99,102,241,0.4)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
          {/* Header */}
          <div style={{ background: activeChatUser ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {activeChatUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => setActiveChatUser(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>← Quay lại</button>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{getDisplayName(activeChatUser)}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                <button onClick={() => { setChatTab('friends'); loadFriendsChatPreview(); }} style={{ padding: '6px 16px', border: 'none', background: chatTab === 'friends' ? '#6366f1' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: chatTab === 'friends' ? 'bold' : 'normal', transition: 'background 0.2s' }}>👥 Bạn bè</button>
                <button onClick={() => setChatTab('community')} style={{ padding: '6px 16px', border: 'none', background: chatTab === 'community' ? '#8b5cf6' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: chatTab === 'community' ? 'bold' : 'normal', transition: 'background 0.2s' }}>🌍 Cộng đồng</button>
              </div>
            )}
            <button onClick={() => { setShowChatWidget(false); setActiveChatUser(null); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>

          {/* Content */}
          {activeChatUser ? (
            // Individual chat
            <>
              <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(!chatMessages[activeChatUser] || chatMessages[activeChatUser].length === 0) ? (
                  <div style={{ margin: 'auto', color: '#6b7280', textAlign: 'center', fontSize: '0.9rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
                    <p>Chưa có tin nhắn</p>
                    <p style={{ fontSize: '0.8rem' }}>Gửi lời chào tới {getDisplayName(activeChatUser)}!</p>
                  </div>
                ) : chatMessages[activeChatUser].map((m, idx) => {
                  const isMe = m.sender === username;
                  return (
                    <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{ background: isMe ? '#6366f1' : 'rgba(255,255,255,0.1)', color: '#fff', padding: '9px 14px', borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0', fontSize: '0.9rem', wordBreak: 'break-word' }}>{m.text}</div>
                    </div>
                  )
                })}
              </div>
              <form onSubmit={handleSendChat} style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`Nhắn ${getDisplayName(activeChatUser)}...`} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '9px 14px', color: '#fff', outline: 'none', fontSize: '0.9rem' }} />
                <button type="submit" style={{ background: '#6366f1', border: 'none', width: '38px', height: '38px', borderRadius: '50%', color: '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
              </form>
            </>
          ) : chatTab === 'friends' ? (
            // Friends list with last message
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {friendsChatPreview.length === 0 && friends.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
                  <p>Chưa có bạn bè nào</p>
                  <p style={{ fontSize: '0.8rem' }}>Thêm bạn từ tab Bạn Bè!</p>
                </div>
              ) : (
                // Merge friends list with chat preview
                (() => {
                  const allFriends = [...new Set([
                    ...friendsChatPreview.map(f => f?.friend).filter(Boolean),
                    ...friends.map(f => {
                      if (!f) return undefined
                      if (typeof f === 'string') return f
                      return f.user1 === username ? f.user2 : (f.user2 === username ? f.user1 : undefined)
                    }).filter(Boolean)
                  ])];
                  return allFriends.map(friend => {
                    const preview = friendsChatPreview.find(f => f.friend === friend);
                    const lastMsg = preview?.lastMessage;
                    const localMsgs = chatMessages[friend] || [];
                    const localLast = localMsgs.length > 0 ? localMsgs[localMsgs.length - 1] : null;
                    const displayMsg = localLast?.text || lastMsg?.text || 'Chưa có tin nhắn';
                    const isLocalMe = localLast?.sender === username;
                    const isDbMe = lastMsg?.sender === username;
                    const prefix = localLast ? (isLocalMe ? 'Bạn: ' : '') : (lastMsg ? (isDbMe ? 'Bạn: ' : '') : '');
                    return (
                      <div key={friend} onClick={() => { setActiveChatUser(friend); setChatUnreadCount(0); loadFriendChat(friend); }} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                          {(friend || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#f3f4f6', fontWeight: '600', fontSize: '0.9rem' }}>{getDisplayName(friend)}</div>
                          <div style={{ color: '#9ca3af', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prefix}{displayMsg}</div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          ) : (
            // Community global chat
            <>
              <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {globalMessages.length === 0 ? (
                  <div style={{ margin: 'auto', color: '#6b7280', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌍</div>
                    <p>Chưa có tin nhắn nào</p>
                    <p style={{ fontSize: '0.8rem' }}>Hãy là người đầu tiên!</p>
                  </div>
                ) : globalMessages.map((m, idx) => {
                  const isMe = m.sender === username;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {!isMe && <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '2px', paddingLeft: '4px' }}>{m.sender}</div>}
                      <div style={{ background: isMe ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff', padding: '8px 12px', borderRadius: isMe ? '14px 14px 0 14px' : '14px 14px 14px 0', fontSize: '0.88rem', maxWidth: '80%', wordBreak: 'break-word' }}>{m.text}</div>
                    </div>
                  )
                })}
              </div>
              <form onSubmit={handleSendGlobal} style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
                <input type="text" value={globalInput} onChange={e => setGlobalInput(e.target.value)} placeholder="Nhắn toàn cộng đồng..." style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '9px 14px', color: '#fff', outline: 'none', fontSize: '0.9rem' }} />
                <button type="submit" style={{ background: '#8b5cf6', border: 'none', width: '38px', height: '38px', borderRadius: '50%', color: '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
              </form>
            </>
          )}
        </div>
      )}

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
                          <img src={b.image} alt={b.name} style={{ height: '72px', width: '72px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
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

      {/* Global Daily Quests Modal */}
      {showDailyQuests && (
        <div onClick={() => setShowDailyQuests(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '8px double #78350f', borderRadius: '20px', padding: '2rem', width: '90%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative', color: '#78350f', fontFamily: 'var(--font-heading)' }}>
            <div style={{ position: 'absolute', top: '-15px', left: '8%', right: '8%', height: '10px', background: '#78350f', borderRadius: '5px' }} />
            <div style={{ position: 'absolute', bottom: '-15px', left: '8%', right: '8%', height: '10px', background: '#78350f', borderRadius: '5px' }} />
            <h3 style={{ textAlign: 'center', margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: '900', letterSpacing: '2px', borderBottom: '2px dashed #78350f', paddingBottom: '0.5rem' }}>📜 CUỘN GIẤY NHIỆM VỤ</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
              {[
                { label: 'Thắng 3 trận đấu', reward: '+200 EXP', done: (stats.wins || 0) >= 3 },
                { label: 'Điểm danh ngày hôm nay', reward: '+50 pts', done: hasCheckedIn },
              ].map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: q.done ? 'rgba(120,53,15,0.1)' : 'rgba(255,255,255,0.5)', borderRadius: '10px', border: q.done ? '1px solid rgba(120,53,15,0.3)' : '1px dashed rgba(120,53,15,0.4)', opacity: q.done ? 0.75 : 1, fontWeight: '700', fontSize: '0.95rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #78350f', display: 'flex', alignItems: 'center', justifyContent: 'center', background: q.done ? '#78350f' : 'transparent', color: q.done ? '#fef3c7' : '#78350f', flexShrink: 0 }}>{q.done && '✓'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ textDecoration: q.done ? 'line-through' : 'none' }}>{q.label}</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>Phần thưởng: <span style={{ color: '#c2410c' }}>{q.reward}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowDailyQuests(false)} style={{ width: '100%', padding: '10px 0', background: '#78350f', color: '#fef3c7', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>ĐÓNG CUỘN GIẤY</button>
          </div>
        </div>
      )}

      {/* Global Navigation (Bottom Left) */}

      <div style={{ position: 'fixed', bottom: '20px', left: '20px', display: 'flex', gap: '10px', zIndex: 9999 }}>
        <button onClick={() => setShowDailyQuests(true)} style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', border: 'none', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.3rem', boxShadow: '0 4px 16px rgba(245,158,11,0.5)' }} title="Nhiệm Vụ Hàng Ngày">📋</button>

        <button
          onClick={() => setActiveTab('home')}
          style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
          title="Trang chủ"
        >
          🏠
        </button>
        {activeTab !== 'home' && (
          <button
            onClick={() => setActiveTab('home')}
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
            title="Quay lại"
          >
            ↩️
          </button>
        )}
      </div>

      {/* === FLOATING BUTTONS: Settings + Chat (stacked above MusicPlayer, right side) === */}
      <div style={{ position: 'fixed', bottom: '90px', right: '24px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9997 }}>
        {/* Settings button */}
        <button
          onClick={() => setActiveTab('settings')}
          title="Cài đặt"
          style={{
            width: '54px', height: '54px', borderRadius: '50%',
            background: activeTab === 'settings' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(15,15,25,0.9)',
            border: '2px solid rgba(99,102,241,0.4)',
            color: '#fff', fontSize: '1.3rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease'
          }}
        >
          ⚙️
        </button>
        {/* Chat button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowChatWidget(o => !o); setChatUnreadCount(0); loadFriendsChatPreview(); }}
            title="Chat"
            style={{
              width: '54px', height: '54px', borderRadius: '50%',
              background: showChatWidget ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(15,15,25,0.9)',
              border: `2px solid ${showChatWidget ? '#6366f1' : 'rgba(99,102,241,0.4)'}`,
              color: '#fff', fontSize: '1.3rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: showChatWidget ? '0 0 20px rgba(99,102,241,0.5), 0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease',
              animation: chatUnreadCount > 0 ? 'pulse 2s infinite' : 'none'
            }}
          >
            💬
          </button>
          {chatUnreadCount > 0 && (
            <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(10,10,20,0.9)' }}>
              {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
            </div>
          )}
        </div>
      </div>

      {/* Notifications Dropdown (Moved to root level to avoid stacking context issues) */}
      {showNotifications && (
        <div className="glass-panel animate-fade-in" style={{ position: 'fixed', top: '80px', right: '16px', marginTop: '10px', width: '320px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '12px', zIndex: 999999, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.7)' }}>
          <div style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Thông Báo</span>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✖</button>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Không có thông báo nào.</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.is_read ? 'transparent' : 'rgba(168,85,247,0.1)', cursor: 'pointer' }}
                  onClick={async () => {
                    if (!n.is_read) {
                      await axios.post(`${API_BASE}/notifications/read/${n.id}`);
                      loadNotifications();
                      loadMyInfo();
                    }
                    // Nếu là lời mời bái sư, mở tab mentor
                    if (n.type === 'mentorship') setActiveTab('mentor');
                  }}
                >
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{n.message}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(n.created_at + 'Z').toLocaleString('vi-VN')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CSS for ticker animation */}
      <style>{`
        @keyframes tickerSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>

                {/* ── Daily Quests Scroll Modal ── */}
    </div>
  )
}

