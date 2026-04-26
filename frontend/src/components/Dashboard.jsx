import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

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

export default function Dashboard({ username, onPlay, onLogout, onViewMatch }) {
  const [activeTab, setActiveTab] = useState('home')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0, total: 0, avgScore: 0 })

  const isGuest = username?.startsWith('Guest_')

  const loadHistory = useCallback(async () => {
    if (isGuest) return
    setHistoryLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/history/${encodeURIComponent(username)}`)
      if (res.data.success) {
        const h = res.data.history
        setHistory(h)
        // Tính stats
        const wins   = h.filter(m => m.result === 'win').length
        const losses = h.filter(m => m.result === 'lose').length
        const draws  = h.filter(m => m.result === 'draw').length
        const avgScore = h.length > 0 ? Math.round(h.reduce((acc, m) => acc + m.score_self, 0) / h.length) : 0
        setStats({ wins, losses, draws, total: h.length, avgScore })
      }
    } catch (err) {
      console.warn('Không tải được lịch sử:', err.message)
    } finally {
      setHistoryLoading(false)
    }
  }, [username, isGuest])

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

  useEffect(() => {
    if (activeTab === 'history') loadHistory()
    if (activeTab === 'leaderboard') loadLeaderboard()
  }, [activeTab, loadHistory, loadLeaderboard])

  const TABS = [
    { id: 'home',       icon: '🎮', label: 'Bảng điều khiển' },
    { id: 'history',    icon: '📋', label: 'Lịch sử trận đấu' },
    { id: 'leaderboard',icon: '🏆', label: 'Bảng xếp hạng' },
    { id: 'guide',      icon: '📖', label: 'Hướng dẫn' },
    { id: 'settings',   icon: '⚙️', label: 'Cài đặt' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
            Xin chào, <span style={{ color: 'var(--accent-primary)' }}>{username}</span>!
          </h2>
          {isGuest && (
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              🔒 Tài khoản khách — lịch sử không được lưu. Đăng ký để lưu kết quả!
            </p>
          )}
        </div>
        <button
          onClick={onLogout}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-full)', cursor: 'pointer', transition: 'all 0.3s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
        >
          Đăng xuất
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', flex: 1 }}>

        {/* ── Sidebar ── */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: 'start' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              fontSize: '1rem', fontWeight: activeTab === tab.id ? '600' : 'normal',
              textAlign: 'left', transition: 'all 0.2s ease',
              borderLeft: activeTab === tab.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
            }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', minHeight: '500px' }}>

          {/* HOME */}
          {activeTab === 'home' && (
            <div>
              {/* Stats row */}
              {!isGuest && stats.total > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '2.5rem' }}>
                  {[
                    { label: 'Trận đã chơi', value: stats.total, color: 'var(--accent-primary)', icon: '🎮' },
                    { label: 'Chiến thắng',  value: stats.wins,  color: '#10b981', icon: '🏆' },
                    { label: 'Thất bại',     value: stats.losses,color: '#ef4444', icon: '💔' },
                    { label: 'Điểm TB',      value: stats.avgScore, color: '#f59e0b', icon: '⭐' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{s.icon}</div>
                      <div style={{ fontSize: '2rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ textAlign: 'center', margin: 'auto', paddingTop: stats.total > 0 ? '1rem' : '4rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Bạn đã sẵn sàng tranh biện?</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '3rem' }}>
                  Chọn <strong>Chơi ngay</strong> để bắt đầu ghép cặp hoặc thi đấu với AI.
                </p>
                <button onClick={onPlay} className="btn-primary" style={{ padding: '20px 48px', fontSize: '1.5rem', borderRadius: 'var(--radius-full)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
                  🎮 Chơi ngay
                </button>
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
                      <div style={{ fontWeight: '600', color: username === user.username ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: '1.05rem' }}>
                        {user.username} {username === user.username && '(Bạn)'}
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

        </div>
      </div>
    </div>
  )
}
