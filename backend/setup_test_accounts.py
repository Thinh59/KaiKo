import sqlite3
import hashlib
from datetime import datetime, timezone

def setup_mock_data():
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()

    # Clear old data for these test accounts
    test_users = ['cuanon_test', 'cuacum_test', 'cuahoangde_test']
    cursor.execute(f"DELETE FROM users WHERE username IN ({','.join(['?']*3)})", test_users)
    cursor.execute(f"DELETE FROM match_history WHERE username IN ({','.join(['?']*3)})", test_users)

    # 1. Create accounts (password: 123456)
    pwd_hash = hashlib.sha256("123456".encode()).hexdigest()
    for user in test_users:
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (user, pwd_hash))

    # 2. Add history (EXP = wins * 10)
    # Level 5 = 400 EXP -> 40 wins
    # Level 45 = 4400 EXP -> 440 wins
    # Level 101 = 10000 EXP -> 1000 wins
    
    levels = {
        'cuanon_test': 40,
        'cuacum_test': 440,
        'cuahoangde_test': 1000
    }

    played_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    history_data = []

    for user, wins in levels.items():
        for i in range(wins):
            history_data.append((
                user, "Bot_Gemini", "Test Topic", "solo_ai", "win",
                85, 60, 0, 0, "Test summary", played_at
            ))

    cursor.executemany("""
        INSERT INTO match_history
            (username, opponent, topic, mode, result,
             score_self, score_opp, fallacies_self, fallacies_opp, summary, played_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, history_data)

    conn.commit()
    conn.close()
    print("Đã tạo xong dữ liệu test!")

if __name__ == "__main__":
    setup_mock_data()
