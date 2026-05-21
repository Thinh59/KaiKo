import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
import traceback
import sys

with open('trace.txt', 'w') as f:
    try:
        url = 'postgresql://neondb_owner:npg_S9WJvBcChV2N@ep-cool-dust-ao74kco7.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
        conn = psycopg2.connect(url)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        played_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO match_history
                (username, opponent, topic, mode, result,
                 score_self, score_opp, fallacies_self, fallacies_opp, 
                 fallacies_list_self, fallacies_list_opp, summary, played_at,
                 transcript_self, transcript_opp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            'Sunner', 'KaniKani', 'Test', 'solo_ai', 'win',
            10, 5,
            0, 0,
            '', '',
            'Test summary', played_at,
            '', ''
        ))
        match_id = cursor.fetchone()['id']
        f.write(f"Inserted match_id: {match_id}\n")

        # Phân biệt điểm theo loại
        pts = 5
        cursor.execute("UPDATE users SET store_points = COALESCE(store_points,0) + %s WHERE username = %s", (pts, 'Sunner'))
        
        # Tăng số trận đấu giữa 2 bạn bè
        cursor.execute("""
            UPDATE friends SET debate_count = COALESCE(debate_count,0) + 1
            WHERE (user1=%s AND user2=%s) OR (user1=%s AND user2=%s)
            RETURNING debate_count
        """, ('Sunner', 'KaniKani', 'KaniKani', 'Sunner'))
        f_row = cursor.fetchone()
        f.write("Friend update done\n")

        if f_row and f_row['debate_count'] == 50:
            for u in ['Sunner', 'KaniKani']:
                cursor.execute("SELECT id FROM user_items WHERE username=%s AND item_id='title_banthan'", (u,))
                if not cursor.fetchone():
                    cursor.execute("INSERT INTO user_items (username, item_id, item_type, obtained_at) VALUES (%s, 'title_banthan', 'badge', %s)", (u, played_at))


        # Cập nhật số trận Mentorship và tự động xuất sư
        cursor.execute("""
            UPDATE mentorship SET debate_count = COALESCE(debate_count,0) + 1 
            WHERE ((master=%s AND disciple=%s) OR (master=%s AND disciple=%s)) AND is_graduated=FALSE
            RETURNING id, debate_count, master, disciple
        """, ('Sunner', 'KaniKani', 'KaniKani', 'Sunner'))
        m_row = cursor.fetchone()
        f.write("Mentorship update done\n")
        
        if m_row and m_row['debate_count'] >= 20:
            cursor.execute("UPDATE mentorship SET is_graduated=TRUE, graduated_date=%s WHERE id=%s", (played_at, m_row['id']))

        # --- TÍNH TOÁN LEVEL PHỨC TẠP ---
        cursor.execute("SELECT level_real, consecutive_losses FROM users WHERE username=%s", ('Sunner',))
        user_data = cursor.fetchone()
        current_level = user_data['level_real'] if user_data and user_data['level_real'] else 1
        consecutive_losses = user_data['consecutive_losses'] if user_data and user_data['consecutive_losses'] else 0
        f.write("User stats loaded\n")

        cursor.execute("SELECT MAX(score_self) as max_score FROM match_history WHERE username=%s AND played_at < %s", ('Sunner', played_at))
        max_score = cursor.fetchone()['max_score'] or 0

        cursor.execute("SELECT score_self FROM match_history WHERE username=%s AND played_at < %s ORDER BY id DESC LIMIT 1", ('Sunner', played_at))
        prev_row = cursor.fetchone()
        prev_score = prev_row['score_self'] if prev_row else 0
        
        cursor.execute("SELECT COUNT(DISTINCT event_id) as event_count FROM event_participants WHERE username=%s", ('Sunner',))
        event_count = cursor.fetchone()['event_count'] or 0

        cursor.execute("UPDATE users SET level_real=%s, consecutive_losses=%s WHERE username=%s", (1, 0, 'Sunner'))
        
        # 1. First Win
        cursor.execute("SELECT COUNT(id) as win_count FROM match_history WHERE username=%s AND result='win'", ('Sunner',))
        win_count = cursor.fetchone()['win_count']
        if win_count == 1:
            cursor.execute("INSERT INTO user_achievements (username, achievement_id, unlocked_at) VALUES (%s, 'first_win', %s) ON CONFLICT DO NOTHING", ('Sunner', played_at))

        f.write("Success\n")
        conn.rollback()

    except Exception as e:
        f.write("ERROR:\n")
        traceback.print_exc(file=f)

    if 'conn' in locals():
        conn.close()
