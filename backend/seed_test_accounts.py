# -*- coding: utf-8 -*-
"""
Seed các TÀI KHOẢN TEST theo từng mốc level để demo/test đủ khung, danh hiệu, quyền.
Level điều khiển: danh hiệu (rank), khung avatar (Gỗ 11 / Bạc 31 / Vàng 61 / Kim Cương 91),
và quyền Giám khảo (Lv 101). Tài khoản Lv101 còn được set role='admin' để test quyền admin.

Cách chạy (từ thư mục backend, đã có DATABASE_URL trong .env hoặc biến môi trường):
    cd backend
    python seed_test_accounts.py

Mật khẩu tất cả tài khoản: Kaiko@123
"""
import os
import hashlib

import psycopg2

PASSWORD = "Kaiko@123"
PWD_HASH = hashlib.sha256(PASSWORD.encode()).hexdigest()

# (username, nickname, level_real, role)
ACCOUNTS = [
    ("kaiko_lv1",   "Cua Non Test",      1,   "user"),   # chưa có khung
    ("kaiko_lv11",  "Cua Gỗ Test",       11,  "user"),   # Khung Gỗ
    ("kaiko_lv31",  "Cua Bạc Test",      31,  "user"),   # Khung Bạc
    ("kaiko_lv61",  "Cua Vàng Test",     61,  "user"),   # Khung Vàng
    ("kaiko_lv91",  "Cua Kim Cương Test", 91, "user"),   # Khung Kim Cương
    ("kaiko_lv101", "Hoàng Đế Cua Test", 101, "admin"),  # Giám khảo + admin
]
STORE_POINTS = 999999  # để test mua sắm cửa hàng thoải mái


def _get_database_url():
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    # Fallback: đọc từ backend/.env
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("❌ Không tìm thấy DATABASE_URL (đặt biến môi trường hoặc trong backend/.env)")


def main():
    conn = psycopg2.connect(_get_database_url())
    cur = conn.cursor()
    for username, nickname, level, role in ACCOUNTS:
        cur.execute(
            """
            INSERT INTO users (username, password_hash, nickname, level_real, store_points, role, is_banned)
            VALUES (%s, %s, %s, %s, %s, %s, FALSE)
            ON CONFLICT (username) DO UPDATE
              SET password_hash = EXCLUDED.password_hash,
                  nickname      = EXCLUDED.nickname,
                  level_real    = EXCLUDED.level_real,
                  store_points  = EXCLUDED.store_points,
                  role          = EXCLUDED.role,
                  is_banned     = FALSE
            """,
            (username, PWD_HASH, nickname, level, STORE_POINTS, role),
        )
    conn.commit()
    cur.close()
    conn.close()

    print("✅ Đã seed các tài khoản test (mật khẩu chung: %s)\n" % PASSWORD)
    print(f"{'Username':<14} {'Level':>5}  {'Role':<6} Khung/Quyền")
    print("-" * 60)
    frames = {1: "(chưa có khung)", 11: "Khung Gỗ", 31: "Khung Bạc",
              61: "Khung Vàng", 91: "Khung Kim Cương", 101: "Giám khảo + Admin"}
    for username, _nick, level, role in ACCOUNTS:
        print(f"{username:<14} {level:>5}  {role:<6} {frames.get(level, '')}")


if __name__ == "__main__":
    main()
