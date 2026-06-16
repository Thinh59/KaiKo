import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE } from '../config'

export default function CrabGame({ username, setPoints, onClose }) {
  const [crabLevel, setCrabLevel] = useState(() => parseInt(localStorage.getItem('kaiko_crab_level_' + username) || '1'))
  const [crabExp, setCrabExp] = useState(() => parseInt(localStorage.getItem('kaiko_crab_exp_' + username) || '0'))
  const [clicks, setClicks] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [floatingTexts, setFloatingTexts] = useState([])
  
  // Save progress
  useEffect(() => {
    localStorage.setItem('kaiko_crab_level_' + username, crabLevel)
    localStorage.setItem('kaiko_crab_exp_' + username, crabExp)
  }, [crabLevel, crabExp, username])

  const expNeeded = crabLevel * 20

  const handleFeed = async (e) => {
    // Generate floating text +1
    const id = Date.now() + Math.random()
    const rect = e.currentTarget.getBoundingClientRect()
    // Random position within the crab
    const x = Math.random() * 80 - 40
    const y = Math.random() * 40 - 20
    
    setClicks(p => p + 1)
    let newExp = crabExp + 1
    let newLevel = crabLevel
    let earnedPoints = 0
    let floatStr = '+1 exp'
    
    // Thưởng random điểm (tỉ lệ 5%)
    if (Math.random() < 0.05) {
      earnedPoints += 1
      floatStr = '+1 điểm 💰'
    }

    if (newExp >= expNeeded) {
      newExp -= expNeeded
      newLevel += 1
      earnedPoints += newLevel * 2 // Thưởng tiền khi lên cấp
      floatStr = `LEVEL UP! +${newLevel * 2} 💰`
    }
    
    setFloatingTexts(prev => [...prev, { id, text: floatStr, x, y }])
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000)

    setCrabExp(newExp)
    setCrabLevel(newLevel)
    
    if (earnedPoints > 0) {
       // Cập nhật giao diện lập tức
       setPoints(prev => prev + earnedPoints)
       
       // Sync ngầm lên server
       setIsSyncing(true)
       try {
         await axios.post(`${API_BASE}/crab-game/sync`, {
           username,
           crab_level: newLevel,
           crab_exp: newExp,
           points_earned: earnedPoints
         })
       } catch (e) {
         console.error("Lỗi đồng bộ game cua", e)
       } finally {
         setIsSyncing(false)
       }
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
        }
      `}</style>
      <div style={{ background: 'var(--panel-bg)', borderRadius: '24px', width: '90%', maxWidth: '380px', padding: '2rem', textAlign: 'center', border: '2px solid #fbbf24', boxShadow: '0 10px 40px rgba(251,191,36,0.3)', position: 'relative', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {isSyncing && <div style={{ position: 'absolute', top: '10px', left: '15px', color: '#10b981', fontSize: '0.7rem' }}>Đang lưu...</div>}
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        
        <h2 style={{ color: '#fbbf24', margin: '0 0 5px 0' }}>🦀 Trại Cua KaiKo</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Cho cua ăn để lên cấp và nhận điểm cửa hàng!</p>

        <div style={{ position: 'relative', display: 'inline-block', margin: '1rem 0' }}>
          <img 
            src="/assets/mascots/summer/CuaDua.png" 
            alt="Crab"
            onClick={handleFeed}
            style={{ 
              width: '180px', 
              cursor: 'pointer', 
              userSelect: 'none', 
              transform: `scale(${1 + (clicks % 2) * 0.05})`, 
              transition: 'transform 0.1s cubic-bezier(0.34,1.56,0.64,1)',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))'
            }}
            draggable={false}
          />

          {floatingTexts.map(f => (
            <div key={f.id} style={{
              position: 'absolute',
              left: `calc(50% + ${f.x}px)`,
              top: `calc(30% + ${f.y}px)`,
              color: f.text.includes('💰') ? '#fbbf24' : '#fff',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
              animation: 'floatUp 1s cubic-bezier(0.34,1.56,0.64,1) forwards',
              zIndex: 10
            }}>
              {f.text}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>Cấp độ {crabLevel}</span>
            <span style={{ color: '#fbbf24', fontSize: '0.9rem' }}>{crabExp} / {expNeeded} EXP</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${(crabExp / expNeeded) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', transition: 'width 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </div>
        </div>

        <p style={{ marginTop: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>
          *Mẹo: Click liên tục vào cua để cho ăn. Tỉ lệ rơi điểm ngẫu nhiên là 5%. Lên cấp sẽ nhận được nhiều điểm hơn!
        </p>
      </div>
    </div>
  )
}
