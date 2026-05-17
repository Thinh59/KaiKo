# ============================================
# INSTALL:
# pip install datasets pandas pyarrow tqdm google-genai
# ============================================

from datasets import load_dataset
import pandas as pd
from tqdm import tqdm
from google import genai
import time
import json
import os

# ============================================
# CONFIG
# ============================================

API_KEY = "YOUR API KEY"

MODEL_NAME = "gemini-3.1-flash-lite-preview"
    
OUTPUT_FILE = "logical_fallacy_vi.csv"

# ============================================
# INIT GEMINI
# ============================================

client = genai.Client(api_key=API_KEY)

# ============================================
# LOAD DATASET FROM HUGGINGFACE
# ============================================

dataset = load_dataset("tasksource/logical-fallacy")

# lấy train split
train_data = dataset["train"]

# convert sang pandas
df = train_data.to_pandas()

print("Dataset size:", len(df))

# ============================================
# XEM COLUMN
# ============================================

print(df.columns)

# ============================================
# CHỌN TEXT COLUMN
# ============================================

TEXT_COLUMN = "source_article"

# ============================================
# TRANSLATE FUNCTION
# ============================================

def translate_batch(texts):
    texts_json = json.dumps(texts, ensure_ascii=False)
    prompt = f"""
Bạn là chuyên gia tranh biện tiếng Việt.
Tôi có một danh sách mảng JSON chứa các câu tiếng Anh.

Hãy:
- Dịch từng câu sang tiếng Việt tự nhiên.
- Giữ nguyên logical fallacy nếu có.
- Văn phong giống sinh viên tranh luận.
- Trả về ĐÚNG MỘT MẢNG JSON các chuỗi (strings) tương ứng với từng câu, không giải thích gì thêm, không bọc trong markdown tick.
Ví dụ: ["câu 1", "câu 2", "câu 3"]

Đầu vào JSON:
{texts_json}
"""
    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            
            # Parse JSON
            result_str = response.text.strip()
            if result_str.startswith("```json"):
                result_str = result_str[7:-3]
            elif result_str.startswith("```"):
                result_str = result_str[3:-3]
                
            translated = json.loads(result_str.strip())
            if len(translated) == len(texts):
                return translated
            else:
                print("ERROR: Số lượng câu dịch không khớp!")
                return [""] * len(texts)
        except Exception as e:
            err_msg = str(e)
            if "503" in err_msg or "429" in err_msg or "500" in err_msg:
                wait_time = 2 ** attempt
                print(f"-> Máy chủ API quá tải (503/429), thử lại lần {attempt+1}/{max_retries} sau {wait_time}s...")
                time.sleep(wait_time)
            else:
                print("ERROR:", e)
                return [""] * len(texts)
    
    print("-> Đã thử lại nhiều lần nhưng thất bại.")
    return [""] * len(texts)

# ============================================
# TRANSLATE LOOP (BATCHING & AUTO-RESUME)
# ============================================

BATCH_SIZE = 10

# Load existing progress if available
if os.path.exists(OUTPUT_FILE):
    df_out = pd.read_csv(OUTPUT_FILE)
    print(f"-> Đã tìm thấy file {OUTPUT_FILE}, tiếp tục tiến trình cũ...")
else:
    df_out = df.copy()
    df_out["text_vi"] = ""
    df_out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

# Tìm các câu chưa được dịch
unprocessed_indices = df_out[df_out["text_vi"].isna() | (df_out["text_vi"] == "")].index.tolist()

print(f"Bắt đầu dịch với Batch Size = {BATCH_SIZE}... Còn {len(unprocessed_indices)} câu cần dịch.")

for i in tqdm(range(0, len(unprocessed_indices), BATCH_SIZE)):
    batch_indices = unprocessed_indices[i:i+BATCH_SIZE]
    batch = df_out.loc[batch_indices, TEXT_COLUMN].tolist()
    batch_str = [str(t) for t in batch]
    
    vi_texts = translate_batch(batch_str)
    
    # Cập nhật kết quả vào dataframe
    for j, idx in enumerate(batch_indices):
        if j < len(vi_texts):
            df_out.at[idx, "text_vi"] = vi_texts[j]
            
    # LƯU NGAY LẬP TỨC VÀO FILE (Tránh mất data nếu bị ngắt ngang)
    df_out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")
    
    # tránh rate limit của Free Tier (Gemini 2.5/3.1 flash = 15 RPM)
    time.sleep(4)

print("DONE!")
print("Saved to:", OUTPUT_FILE)
