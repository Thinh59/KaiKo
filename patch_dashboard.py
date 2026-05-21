#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch Dashboard.jsx to:
1. Add Daily Quest button to global nav (bottom-left)
2. Add global Daily Quest modal (outside any tab condition)
3. Remove the old quest modal from inside the home tab block
"""

file_path = r"d:\NA\Kì 6\Công Nghệ Phần Mềm Cho Hệ Thống Trí Tuệ Nhân Tạo\Project\KaiKo\kaiko\frontend\src\components\Dashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# ──────────────────────────────────────────────────────────────
# 1. ADD QUEST BUTTON to global nav (bottom-left)
# ──────────────────────────────────────────────────────────────
OLD_NAV = """      {/* Global Navigation (Bottom Left) */}
      <div style={{ position: 'fixed', bottom: '20px', left: '20px', display: 'flex', gap: '10px', zIndex: 9999 }}>
        <button
          onClick={() => setActiveTab('home')}
          style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
          title="Trang chủ"
        >
          🏠
        </button>"""

NEW_NAV = """      {/* Global Navigation (Bottom Left) */}
      <div style={{ position: 'fixed', bottom: '20px', left: '20px', display: 'flex', gap: '10px', zIndex: 9999 }}>
        <button
          onClick={() => setShowDailyQuests(true)}
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', border: 'none', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.3rem', boxShadow: '0 4px 16px rgba(245,158,11,0.5)' }}
          title="Nhiệm Vụ Hàng Ngày"
        >
          📋
        </button>
        <button
          onClick={() => setActiveTab('home')}
          style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
          title="Trang chủ"
        >
          🏠
        </button>"""

# Normalize line endings for matching
content_lf = content.replace('\r\n', '\n')
old_nav_lf = OLD_NAV.replace('\r\n', '\n')
new_nav_lf = NEW_NAV.replace('\r\n', '\n')

if old_nav_lf in content_lf:
    content_lf = content_lf.replace(old_nav_lf, new_nav_lf, 1)
    print("✅ Added quest button to global nav")
else:
    print("❌ Could not find global nav target")
    # Show what we're looking for (first 100 chars) vs what's in file
    idx = content_lf.find("Global Navigation")
    if idx != -1:
        print("Found 'Global Navigation' at idx:", idx)
        print(repr(content_lf[idx:idx+300]))

# ──────────────────────────────────────────────────────────────
# 2. ADD GLOBAL DAILY QUEST MODAL before the global nav block
# ──────────────────────────────────────────────────────────────
GLOBAL_MODAL = """
      {/* Global Daily Quests Modal - accessible from any tab */}
      {showDailyQuests && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10000,
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
            <div style={{ position: 'absolute', top: '-15px', left: '8%', right: '8%', height: '10px', background: '#78350f', borderRadius: '5px' }} />
            <div style={{ position: 'absolute', bottom: '-15px', left: '8%', right: '8%', height: '10px', background: '#78350f', borderRadius: '5px' }} />
            <h3 style={{ textAlign: 'center', margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: '900', letterSpacing: '2px', borderBottom: '2px dashed #78350f', paddingBottom: '0.5rem' }}>
              📜 CUỘN GIẤY NHIỆM VỤ
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
              {[
                { label: 'Thắng 3 trận đấu', reward: '+200 EXP', done: (stats.wins || 0) >= 3 },
                { label: 'Điểm danh ngày hôm nay', reward: '+50 pts', done: hasCheckedIn },
              ].map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: q.done ? 'rgba(120,53,15,0.1)' : 'rgba(255,255,255,0.5)', borderRadius: '10px', border: q.done ? '1px solid rgba(120,53,15,0.3)' : '1px dashed rgba(120,53,15,0.4)', opacity: q.done ? 0.75 : 1, textDecoration: q.done ? 'line-through' : 'none', fontWeight: '700', fontSize: '0.95rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #78350f', display: 'flex', alignItems: 'center', justifyContent: 'center', background: q.done ? '#78350f' : 'transparent', color: q.done ? '#fef3c7' : '#78350f', flexShrink: 0 }}>
                    {q.done && '✓'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div>{q.label}</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: '600' }}>Phần thưởng: <span style={{ color: '#c2410c' }}>{q.reward}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowDailyQuests(false)} style={{ width: '100%', padding: '10px 0', background: '#78350f', color: '#fef3c7', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px', fontFamily: 'var(--font-heading)', boxShadow: '0 4px 10px rgba(120,53,15,0.3)', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#92400e'}
              onMouseLeave={e => e.currentTarget.style.background = '#78350f'}
            >
              ĐÓNG CUỘN GIẤY
            </button>
          </div>
        </div>
      )}
"""

NAV_ANCHOR = "      {/* Global Navigation (Bottom Left) */}"
if NAV_ANCHOR in content_lf:
    content_lf = content_lf.replace(NAV_ANCHOR, GLOBAL_MODAL + NAV_ANCHOR, 1)
    print("✅ Added global quest modal")
else:
    print("❌ Could not find nav anchor for modal insertion")

# ──────────────────────────────────────────────────────────────
# 3. REMOVE OLD QUEST MODAL from inside home tab
# ──────────────────────────────────────────────────────────────
# The old modal starts with: {showDailyQuests && (
# and ends with:           )}
# It's inside the home tab block (activeTab === 'home').
# We'll find it by its unique anchor: "CUỘN GIẤY NHIỆM VỤ" in the home section.
# The home section modal is the FIRST occurrence of showDailyQuests inside a tab block.

import re

# Find the home tab section showDailyQuests block
# It appears AFTER activeTab === 'home' section begins and BEFORE activeTab === 'history'
home_start = content_lf.find("activeTab === 'home' && (")
history_start = content_lf.find("activeTab === 'history'")

home_section = content_lf[home_start:history_start]

# Find the old modal in home section
old_modal_start_marker = "                {showDailyQuests && ("
old_modal_end_marker = "                )}"

start_in_home = home_section.find(old_modal_start_marker)
if start_in_home != -1:
    # Find the closing )} after the modal content
    # We need to count brackets properly, or just find the specific closing marker after the modal
    # The modal ends right before the closing of the home tab </div> block
    # Find the position in the full content
    abs_start = content_lf.find(old_modal_start_marker, content_lf.find("activeTab === 'home' && ("))
    
    # Find the end: look for the pattern that closes the modal
    # The modal close is: "                )}" followed by a blank line and then "              </div>"
    search_from = abs_start + len(old_modal_start_marker)
    # We need to find the matching closing for this block
    depth = 1
    i = search_from
    while i < len(content_lf) and depth > 0:
        if content_lf[i:i+2] == '{s' and 'showDailyQuests' not in content_lf[i:i+20]:
            pass
        if content_lf[i] == '{':
            depth += 1
        elif content_lf[i] == '}':
            depth -= 1
        i += 1
    
    # The block from abs_start to i should be the full modal
    # But let's use a simpler marker-based approach
    # The modal ends with: "                )}\n"
    # Find the last occurrence of "ĐÓNG CUỘN GIẤY" in home section and then find the closing
    dong_idx = content_lf.find("ĐÓNG CUỘN GIẤY", abs_start)
    if dong_idx != -1:
        # After ĐÓNG CUỘN GIẤY, find the closing )}
        close_idx = content_lf.find("\n                )}", dong_idx)
        if close_idx != -1:
            end_idx = close_idx + len("\n                )}")
            old_modal_full = content_lf[abs_start:end_idx]
            content_lf = content_lf.replace(old_modal_full, "", 1)
            print("✅ Removed old quest modal from home tab")
        else:
            print("❌ Could not find modal close marker")
    else:
        print("❌ Could not find ĐÓNG CUỘN GIẤY in home section")
else:
    print("❌ Could not find old modal in home section (maybe already removed?)")

# ──────────────────────────────────────────────────────────────
# Write back
# ──────────────────────────────────────────────────────────────
# Restore CRLF for Windows
final_content = content_lf.replace('\n', '\r\n')
# But avoid double CRLF
final_content = final_content.replace('\r\r\n', '\r\n')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(final_content)

print("✅ File saved successfully")
