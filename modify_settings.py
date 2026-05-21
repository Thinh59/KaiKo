import re

file_path = r"d:\NA\Kì 6\Công Nghệ Phần Mềm Cho Hệ Thống Trí Tuệ Nhân Tạo\Project\KaiKo\kaiko\frontend\src\components\Dashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# --- 1. Fix title: change "Cài đặt" heading (remove emoji, lowercase) ---
content = content.replace(
    '<h2 style={{ fontSize: \'2.5rem\', color: \'var(--text-primary)\', marginBottom: \'2rem\', textAlign: \'center\' }}>Cài đặt</h2>',
    '<h2 style={{ fontSize: \'2.5rem\', color: \'var(--text-primary)\', marginBottom: \'2rem\', textAlign: \'center\' }}>Cài đặt</h2>'
)

# --- 2. Extract the daily quests modal from the home tab block ---
# Find where it starts and ends inside home tab
MODAL_START = '{showDailyQuests && ('
# Find the position of the modal in the file
modal_start_idx = content.find(MODAL_START)
if modal_start_idx == -1:
    print("Modal start not found!")
else:
    print(f"Modal found at index {modal_start_idx}")
    # Get context
    print(content[modal_start_idx-50:modal_start_idx+100])

