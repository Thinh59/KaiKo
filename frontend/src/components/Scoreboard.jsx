import { useState } from 'react'

const COLOR = { good: '#10b981', warn: '#f59e0b', bad: '#ef4444', info: '#3b82f6' }

function Badge({ type, text }) {
  return (
    <span style={{
      background: COLOR[type] + '20', color: COLOR[type],
      border: `1px solid ${COLOR[type]}`,
      borderRadius: 'var(--radius-full)', padding: '4px 12px', fontSize: '0.85rem', marginRight: 8, marginBottom: 8,
      display: 'inline-block',
      fontWeight: '500'
    }}>{text}</span>
  )
}

function PlayerCard({ name, data, transcript }) {
  const [tab, setTab] = useState('score')

  return (
    <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem' }}>{name}</h3>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--accent-primary)' }}>
          {data?.total ?? '--'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ 100</span>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)' }}>
        {['score', 'analysis', 'tips', 'transcript'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
            background: tab === t ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            borderBottom: tab === t ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: tab === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: tab === t ? '600' : 'normal', fontSize: '0.95rem',
            transition: 'all 0.3s'
          }}>
            {{ score: '📊 Điểm', analysis: '🔍 Phân tích', tips: '💡 Gợi ý', transcript: '📜 Ghi âm' }[t]}
          </button>
        ))}
      </div>

      <div style={{ padding: '1.5rem', flex: 1, background: 'rgba(255,255,255,0.02)' }}>
        {tab === 'score' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <tbody>
              {[
                ['Logic & Lập luận', data?.logic, 40],
                ['Phong thái & Body language', data?.delivery, 20],
                ['Giọng nói & Ngữ điệu', data?.voice, 20],
                ['Phản biện đối phương', data?.rebuttal, 20],
              ].map(([label, score, max]) => (
                <tr key={label}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{label}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {score ?? '--'}<span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.85rem' }}>/{max}</span>
                  </td>
                </tr>
              ))}
              <tr style={{ color: '#ef4444' }}>
                <td style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Trừ điểm</td>
                <td style={{ textAlign: 'right', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>-{data?.deduct ?? 0}</td>
              </tr>
              <tr>
                <td style={{ padding: '16px 0 0', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Tổng</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--accent-primary)', padding: '16px 0 0' }}>{data?.total ?? '--'}</td>
              </tr>
            </tbody>
          </table>
        )}

        {tab === 'analysis' && (
          <div>
            <p style={{ fontWeight: '600', marginBottom: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> Điểm mạnh
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              {data?.strengths?.map((s, i) => <Badge key={i} type="good" text={s} />) || <span style={{ color: 'var(--text-secondary)' }}>Chưa có dữ liệu</span>}
            </div>

            <p style={{ fontWeight: '600', margin: '0 0 12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Điểm yếu
            </p>
            <div>
              {data?.weaknesses?.map((w, i) => <Badge key={i} type="warn" text={w} />) || <span style={{ color: 'var(--text-secondary)' }}>Chưa có dữ liệu</span>}
            </div>
          </div>
        )}

        {tab === 'tips' && (
          <div>
            <p style={{ fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💡</span> Gợi ý để cải thiện
            </p>
            {data?.tips?.length > 0 ? data.tips.map((tip, i) => (
              <div key={i} style={{
                display: 'flex', gap: '12px', marginBottom: '12px',
                background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-md)', padding: '16px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.2rem', lineHeight: 1 }}>{i + 1}</span>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</p>
              </div>
            )) : <span style={{ color: 'var(--text-secondary)' }}>Chưa có gợi ý</span>}
          </div>
        )}

        {tab === 'transcript' && (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
             <p style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span>📜</span> Nội dung phát biểu / Chat:
             </p>
             <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {transcript || 'Không có dữ liệu ghi âm / chat.'}
             </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Scoreboard({ result, onRestart }) {
  if (!result) return null
  const { scores, playerA, playerB, transcript_a, transcript_b } = result

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: '24px', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>🏆 Kết quả trận đấu</h2>

      <div className="glass-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <span>🥇</span> Người chiến thắng: {scores?.winner || 'Hòa'}
        </div>
        <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '800px', marginInline: 'auto' }}>{scores?.why}</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <PlayerCard name={playerA} data={scores?.player_a} transcript={transcript_a} />
        <PlayerCard name={playerB} data={scores?.player_b} transcript={transcript_b} />
      </div>

      {scores?.comment && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'rgba(59, 130, 246, 0.05)', borderLeft: '4px solid #3b82f6' }}>
          <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1.1rem' }}>📝 Nhận xét tổng quan:</strong>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{scores.comment}</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '2rem' }}>
        <button onClick={onRestart} className="btn-primary" style={{ padding: '16px 40px', fontSize: '1.2rem', borderRadius: 'var(--radius-full)' }}>
          🔄 Chơi lại
        </button>
      </div>
    </div>
  )
}
