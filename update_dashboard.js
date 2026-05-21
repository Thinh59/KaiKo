const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/Dashboard.jsx');
let lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// 1. Add states
const stateTarget = 'const [showChatWidget, setShowChatWidget] = useState(false)';
const stateIdx = lines.findIndex(l => l.includes(stateTarget));

if (stateIdx !== -1) {
    const newStates = [
        "  const [oldPassword, setOldPassword] = useState('')",
        "  const [newPassword, setNewPassword] = useState('')",
        "  const [globalVolume, setGlobalVolume] = useState(() => parseFloat(localStorage.getItem('kaiko_volume') || '1.0'))",
        "  const [camEnabled, setCamEnabled] = useState(false)",
        "  const [micEnabled, setMicEnabled] = useState(false)"
    ];
    lines.splice(stateIdx + 1, 0, ...newStates);
}

// 2. Remove Settings 1
let s1Start = -1, s1End = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{/* SETTINGS */}')) {
        if (i + 1 < lines.length && lines[i+1].includes("activeTab === 'settings'")) {
            s1Start = i;
            for (let j = i + 1; j < Math.min(i + 100, lines.length); j++) {
                if (lines[j].trim() === ')}') {
                    s1End = j;
                    break;
                }
            }
            break;
        }
    }
}
if (s1Start !== -1 && s1End !== -1) {
    lines.splice(s1Start, s1End - s1Start + 1);
}

// 3. Replace Settings 2
let s2Start = -1, s2End = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{/* CÀI ĐẶT */}')) {
        if (i + 1 < lines.length && lines[i+1].includes("activeTab === 'settings'")) {
            s2Start = i;
            for (let j = i + 1; j < Math.min(i + 100, lines.length); j++) {
                if (lines[j].trim() === ')}') {
                    s2End = j;
                    break;
                }
            }
            break;
        }
    }
}

const settingsReplacement = `            {/* CÀI ĐẶT UNIFIED */}
            {activeTab === 'settings' && (
              <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', paddingBottom: '3rem' }}>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '2rem', textAlign: 'center' }}>⚙️ Cài Đặt</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                  
                  {/* Account Info & Nickname */}
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                    <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 Tài Khoản</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>Tên đăng nhập:</p>
                    <input type="text" value={username} readOnly className="glass-input" style={{ padding: '12px', width: '100%', boxSizing: 'border-box', marginBottom: '16px', background: 'rgba(0,0,0,0.2)' }} />
                    {isGuest && <p style={{ color: '#f59e0b', fontSize: '0.85rem', margin: '-10px 0 16px' }}>⚠️ Tài khoản khách — lịch sử không được lưu.</p>}

                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Biệt danh (Nickname)</label>
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
                            const res = await axios.post(\`\${API_BASE}/set-nickname\`, { username, nickname });
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
                        style={{ padding: '0 16px' }}
                      >
                        Lưu
                      </button>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '10px' }}>
                      Cần 1 "Thẻ Đổi Nickname" nếu bạn đã từng đặt tên trước đó.
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
                              const res = await axios.post(\`\${API_BASE}/change-password\`, { username, old_password: oldPassword, new_password: newPassword });
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
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>Quyền Camera & Mic</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bật để cho phép trong trận</div>
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
                          transition: 'background 0.3s'
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

                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                      <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '16px' }}>Âm Lượng Hệ Thống: {Math.round(globalVolume * 100)}%</div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05" 
                        value={globalVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setGlobalVolume(val);
                          localStorage.setItem('kaiko_volume', val);
                          document.querySelectorAll('audio, video').forEach(el => {
                            el.volume = val;
                          });
                        }}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}`;

if (s2Start !== -1 && s2End !== -1) {
    lines.splice(s2Start, s2End - s2Start + 1, ...settingsReplacement.split('\n'));
}

// 4. Move Daily Quests modal
let dqStart = -1, dqEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{/* ── Daily Quests Scroll Modal ── */}')) {
        dqStart = i;
        let openBrackets = 0;
        let started = false;
        for (let j = i; j < lines.length; j++) {
            openBrackets += (lines[j].match(/\\{/g) || []).length;
            openBrackets -= (lines[j].match(/\\}/g) || []).length;
            if (lines[j].includes('{') || lines[j].includes('}')) {
                started = true;
            }
            if (started && openBrackets === 0) {
                dqEnd = j;
                break;
            }
        }
        break;
    }
}

let extractedDq = [];
if (dqStart !== -1 && dqEnd !== -1) {
    extractedDq = lines.splice(dqStart, dqEnd - dqStart + 1);
}

// Place before the last closing div of the component
let endIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('</div>')) {
        endIdx = i;
        break;
    }
}

if (endIdx !== -1 && extractedDq.length > 0) {
    lines.splice(endIdx, 0, ...extractedDq);
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
console.log("Dashboard updated with Node.js!");
