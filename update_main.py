import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = """@app.post("/set-nickname")
def set_nickname(data: NicknameUpdate):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT username, nickname FROM users WHERE username = %s", (data.username,))
    row = cursor.fetchone()
    if not row:
        cursor.execute("INSERT INTO users (username, password_hash, nickname) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (data.username, "clerk_auth", data.nickname))
    else:
        current_nickname = row['nickname']
        if current_nickname and current_nickname != "":
            cursor.execute("SELECT id FROM user_items WHERE username=%s AND item_id='rename_card'", (data.username,))
            item = cursor.fetchone()
            if not item:
                conn.close()
                return {"success": False, "error": "Bạn cần mua Thẻ Đổi Nickname trong Cửa Hàng để đổi tên!"}
            else:
                cursor.execute("DELETE FROM user_items WHERE id=%s", (item['id'],))
        cursor.execute("UPDATE users SET nickname = %s WHERE username = %s", (data.nickname, data.username))
    conn.commit()
    conn.close()
    return {"success": True}

class PasswordUpdate(BaseModel):
    username: str
    old_password: str
    new_password: str

@app.post("/change-password")
def change_password(data: PasswordUpdate):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    old_hash = hashlib.sha256(data.old_password.encode()).hexdigest()
    cursor.execute("SELECT username FROM users WHERE username = %s AND password_hash = %s", (data.username, old_hash))
    if not cursor.fetchone():
        conn.close()
        return {"success": False, "error": "Mật khẩu cũ không chính xác!"}
    new_hash = hashlib.sha256(data.new_password.encode()).hexdigest()
    cursor.execute("UPDATE users SET password_hash = %s WHERE username = %s", (new_hash, data.username))
    conn.commit()
    conn.close()
    return {"success": True}"""

code = re.sub(r'@app\.post\("/set-nickname"\).*?return \{"success": True\}', replacement, code, flags=re.DOTALL)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated successfully")
