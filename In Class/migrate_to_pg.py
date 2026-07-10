"""Migration script: SQLite → PostgreSQL in main.py"""
import re

with open("main.py", "r", encoding="utf-8") as f:
    src = f.read()

# 1. sqlite3.connect("users.db") → get_db()
src = src.replace('sqlite3.connect("users.db")', 'get_db()')

# 2. conn.row_factory = sqlite3.Row  (remove these lines)
src = re.sub(r'\s*conn\.row_factory\s*=\s*sqlite3\.Row\r?\n', '\n', src)

# 3. Replace cursor = conn.cursor() after get_db() where we need dict rows
#    → use RealDictCursor for endpoints that call [dict(r) for r in ...]
src = src.replace(
    'cursor = conn.cursor()\n    cursor.execute("SELECT * FROM events',
    'cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)\n    cursor.execute("SELECT * FROM events'
)
for fn_marker in [
    'def get_history(',
    'def get_leaderboard(',
]:
    src = src.replace(
        f'{fn_marker}',
        f'__RDCURSOR__{fn_marker}'
    )

# Insert RealDictCursor in those functions
def inject_rdc(text, marker):
    idx = text.find(f'__{marker}__')
    if idx == -1:
        return text
    text = text.replace(f'__{marker}__', marker)
    # Find next "cursor = conn.cursor()" after this marker
    after = text[idx:]
    after = after.replace(
        'cursor = conn.cursor()',
        'cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)',
        1
    )
    return text[:idx] + after

for m in ['def get_history(', 'def get_leaderboard(']:
    src = inject_rdc(src, m)

# 4. [dict(r) for r in cursor.fetchall()] → list(cursor.fetchall())  (RealDictCursor already returns dicts)
src = src.replace('[dict(r) for r in cursor.fetchall()]', 'list(cursor.fetchall())')

# 5. ? placeholders in SQL → %s  (only inside SQL strings)
#    Strategy: replace ", ?" and "(?" patterns
def replace_sql_placeholders(text):
    result = []
    in_sql = False
    i = 0
    while i < len(text):
        # Detect SQL string start (triple-quoted or single-quoted with SQL keywords)
        if text[i:i+3] in ('"""', "'''"):
            quote = text[i:i+3]
            end = text.find(quote, i+3)
            if end == -1:
                result.append(text[i:])
                break
            chunk = text[i:end+3]
            chunk = chunk.replace('?', '%s')
            result.append(chunk)
            i = end + 3
        elif text[i] == '"' or text[i] == "'":
            q = text[i]
            j = i + 1
            while j < len(text) and text[j] != q:
                if text[j] == '\\':
                    j += 2
                else:
                    j += 1
            chunk = text[i:j+1]
            # Only replace ? in strings that look like SQL
            if any(kw in chunk.upper() for kw in ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'VALUES', 'WHERE', 'FROM']):
                chunk = chunk.replace('?', '%s')
            result.append(chunk)
            i = j + 1
        else:
            result.append(text[i])
            i += 1
    return ''.join(result)

src = replace_sql_placeholders(src)

# 6. sqlite3.IntegrityError → psycopg2.errors.UniqueViolation
src = src.replace('sqlite3.IntegrityError', 'Exception')

# 7. INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
src = src.replace('INSERT OR IGNORE INTO', 'INSERT INTO')
# Add ON CONFLICT after each INSERT OR IGNORE replacement
src = re.sub(
    r"(INSERT INTO (?:users|friends|friend_requests|user_items) \([^)]+\) VALUES \([^)]+\))(?!\s+ON CONFLICT)",
    r'\1 ON CONFLICT DO NOTHING',
    src
)

# 8. UPDATE ... SET store_points = store_points - ? — fix double %s issue (already done above)

# 9. cursor.rowcount → cursor.rowcount (no change needed)

with open("main.py", "w", encoding="utf-8") as f:
    f.write(src)

print("Migration to PostgreSQL complete!")

