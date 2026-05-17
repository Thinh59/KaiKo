import pandas as pd
from tqdm import tqdm
from google import genai
import time
import json
import os

# =====================================================
# CONFIG
# =====================================================

API_KEY = "YOUR API KEY"
MODEL_NAME = "gemini-3.1-flash-lite-preview"

INPUT_FILE = "ArgKP_combined.csv"
OUTPUT_FILE = "ArgKP_combined_vi.csv"
DATASET_URL = "https://huggingface.co/datasets/NLP-Debater-Project/IBM-Debater-ArgKP/resolve/main/ArgKP_combined.csv"
TEXT_COLUMN = "argument"
BATCH_SIZE = 10

# =====================================================
# INIT GEMINI
# =====================================================
client = genai.Client(api_key=API_KEY)

# =====================================================
# TRANSLATE FUNCTION
# =====================================================
def translate_batch(texts):
    texts_json = json.dumps(texts, ensure_ascii=False)
    prompt = f"""
Bạn là chuyên gia tranh biện tiếng Việt.
Tôi có một danh sách mảng JSON chứa các câu tiếng Anh.

Hãy:
- dịch tự nhiên sang tiếng Việt
- giữ nguyên ý nghĩa lập luận
- giữ nguyên sắc thái tranh biện
- không dịch máy móc
- văn phong giống sinh viên thật
- Trả về ĐÚNG MỘT MẢNG JSON các chuỗi (strings) tương ứng với từng câu, không giải thích gì thêm.
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
                print(f"-> Máy chủ API quá tải, thử lại lần {attempt+1}/{max_retries} sau {wait_time}s...")
                time.sleep(wait_time)
            else:
                print("ERROR:", e)
                return [""] * len(texts)
    
    return [""] * len(texts)

# =====================================================
# LOAD CSV & RESUME LOGIC
# =====================================================
if not os.path.exists(INPUT_FILE):
    print(f"Đang tải dataset từ HuggingFace ({DATASET_URL})...")
    df = pd.read_csv(DATASET_URL)
    df.to_csv(INPUT_FILE, index=False)
    print(f"Đã lưu file gốc tại {INPUT_FILE}")
else:
    df = pd.read_csv(INPUT_FILE)

# Lấy 2000 câu đầu tiên để làm Đồ án cho nhanh (dịch 36800 câu tốn 9 tiếng)
df = df.head(2000)

if os.path.exists(OUTPUT_FILE):
    df_out = pd.read_csv(OUTPUT_FILE)
    df_out = df_out.head(2000) # Đảm bảo file cũ cũng bị cắt xuống 2000 câu
    print(f"-> Đã tìm thấy file {OUTPUT_FILE}, tiếp tục tiến trình cũ (đã cắt xuống 2000 câu)...")
else:
    df_out = df.copy()
    df_out["argument_vi"] = ""
    df_out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

unprocessed_indices = df_out[df_out["argument_vi"].isna() | (df_out["argument_vi"] == "")].index.tolist()
print(f"Bắt đầu dịch với Batch Size = {BATCH_SIZE}... Còn {len(unprocessed_indices)} câu cần dịch.")

# =====================================================
# TRANSLATE LOOP
# =====================================================
for i in tqdm(range(0, len(unprocessed_indices), BATCH_SIZE)):
    batch_indices = unprocessed_indices[i:i+BATCH_SIZE]
    batch = df_out.loc[batch_indices, TEXT_COLUMN].tolist()
    batch_str = [str(t) for t in batch]
    
    vi_texts = translate_batch(batch_str)
    
    for j, idx in enumerate(batch_indices):
        if j < len(vi_texts):
            df_out.at[idx, "argument_vi"] = vi_texts[j]
            
    df_out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")
    time.sleep(4)

print("DONE!")
print("Saved:", OUTPUT_FILE)
