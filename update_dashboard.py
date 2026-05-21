import os

with open('frontend/src/components/Dashboard.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find state block to insert new states
state_idx = -1
for i, line in enumerate(lines):
    if 'const [showChatWidget, setShowChatWidget] = useState(false)' in line:
        state_idx = i
        break

if state_idx != -1:
    new_states = """  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [globalVolume, setGlobalVolume] = useState(() => parseFloat(localStorage.getItem('kaiko_volume') || '1.0'))
  const [camEnabled, setCamEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
"""
    lines.insert(state_idx + 1, new_states)

# We need to find and remove Settings 1
s1_start = -1
s1_end = -1
for i, line in enumerate(lines):
    if "{/* SETTINGS */}" in line:
        if i + 1 < len(lines) and "activeTab === 'settings'" in lines[i+1]:
            s1_start = i
            # Find matching block end (very crude logic, we know it's a small block ending with ')}'
            for j in range(i+1, min(i+100, len(lines))):
                if lines[j].strip() == ")}":
                    s1_end = j
                    break
            break

if s1_start != -1 and s1_end != -1:
    lines = lines[:s1_start] + lines[s1_end+1:]

# Find Settings 2
s2_start = -1
s2_end = -1
for i, line in enumerate(lines):
    if "{/* CÀI ĐẶT */}" in line:
        if i + 1 < len(lines) and "activeTab === 'settings'" in lines[i+1]:
            s2_start = i
            for j in range(i+1, min(i+100, len(lines))):
                if lines[j].strip() == ")}":
                    s2_end = j
                    break
            break

settings_replacement = """            {/* CÀI ĐẶT UNIFIED */}
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
                            const res = await axios.post(`${API_BASE}/set-nickname`, { username, nickname });
                            if (res.data.success) {
                              localStorage.setItem('kaiko_nickname_' + username, nickname);
                              setGlobalNicknames(prev => ({ ...prev, [username]: nickname }));
                              alert('Đã lưu biệt danh thành công!');
                              loadMyInfo(); // Reload items if card was used
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
            )}
"""

if s2_start != -1 and s2_end != -1:
    lines = lines[:s2_start] + [settings_replacement] + lines[s2_end+1:]


# Move Daily Quests modal
# It starts around line 1218 (or now shifted)
dq_start = -1
dq_end = -1
for i, line in enumerate(lines):
    if "{/* ── Daily Quests Scroll Modal ── */}" in line:
        dq_start = i
        # Find closing div of this modal. It's a big block. 
        # We can count brackets or look for {showDailyQuests && ( ... )} matching end.
        open_brackets = 0
        started = False
        for j in range(i, len(lines)):
            open_brackets += lines[j].count('{') - lines[j].count('}')
            if "{" in lines[j] or "}" in lines[j]:
                started = True
            if started and open_brackets == 0:
                dq_end = j
                break
        break

extracted_dq = []
if dq_start != -1 and dq_end != -1:
    extracted_dq = lines[dq_start:dq_end+1]
    lines = lines[:dq_start] + lines[dq_end+1:]

# Now place Daily Quest modal right before the end of Dashboard component
# We look for the closing div of "dashboard-container" or just before the last `</div>`
end_idx = -1
for i in range(len(lines)-1, -1, -1):
    if "</div>" in lines[i]:
        end_idx = i
        break

if end_idx != -1 and extracted_dq:
    lines = lines[:end_idx] + extracted_dq + lines[end_idx:]

with open('frontend/src/components/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Dashboard updated!")
