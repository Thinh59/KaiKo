import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL")
print(f"Connecting to: {url.split('@')[-1]}")
conn = psycopg2.connect(url)
conn.autocommit = True
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE match_history ADD COLUMN visibility VARCHAR(20) DEFAULT 'private'")
    print("Added visibility column.")
except Exception as e:
    print(f"Column might already exist or error: {e}")

cursor.close()
conn.close()
