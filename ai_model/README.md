# KaiKo — Mô hình AI (`ai_model/`)

Thư mục này chứa toàn bộ phần **Học máy (ML)** của **KaiKo** — nền tảng tranh biện 1v1 thời gian thực
(video/text) tích hợp AI. Trong một trận đấu, KaiKo dùng 2 mô hình tự huấn luyện để phân tích lời tranh
biện của người chơi:

1. **Phát hiện Ngụy biện (Fallacy Detection)** — bắt câu nói mắc lỗi ngụy biện và hiện cảnh báo.
2. **Đối sánh Lập luận – Chủ đề (ArgKP Matching)** — kiểm tra lập luận có bám sát chủ đề hay bị lạc đề.

Cả hai đều **fine-tune từ [`FacebookAI/xlm-roberta-base`](https://huggingface.co/FacebookAI/xlm-roberta-base)**
(mô hình ngôn ngữ đa ngữ, hỗ trợ tốt tiếng Việt). Khi mô hình cục bộ chưa sẵn sàng, backend tự động
chuyển sang **Gemini (`gemini-3.1-flash-lite-preview`)** làm phương án dự phòng.

---

## 1. Hai mô hình

### 🧠 Phát hiện Ngụy biện — phân loại 6 nhóm
Gộp từ 13 loại ngụy biện gốc thành **6 nhóm** tách bạch (giảm chồng nghĩa, bỏ lớp cực hiếm → chính xác hơn):

| Nhóm (nhãn model) | Ý nghĩa | Gộp từ |
|---|---|---|
| `cong_kich_cam_xuc` | Công kích & Cảm xúc | ad hominem, appeal to emotion |
| `so_dong_uy_tin` | Dựa số đông & Uy tín | ad populum, fallacy of credibility |
| `khai_quat_nhan_qua` | Khái quát hóa & Nhân quả sai | faulty generalization, false causality |
| `luong_phan_bop_meo` | Lưỡng phân & Bóp méo | false dilemma, fallacy of extension |
| `lac_de_co_y` | Lạc đề & Cố ý đánh lạc hướng | fallacy of relevance, intentional |
| `mo_ho_vong_vo_logic` | Mơ hồ, Vòng vo & Lỗi logic | equivocation, circular reasoning, fallacy of logic |

### ⚖️ ArgKP — đối sánh lập luận với chủ đề (nhị phân)
Cho một *lập luận* và một *luận điểm/chủ đề*, mô hình dự đoán **KHỚP** (bám chủ đề) hay **KHÔNG KHỚP** (lạc đề).
Đây là bài phân loại cặp câu (sentence-pair). Ngưỡng quyết định `KHOP ≥ 0.60` được chọn qua tập validation và
lưu tại `decision_threshold.json` kèm model.

---

## 2. Kết quả hiện tại (đo trên tập test)

| Mô hình | Chỉ số chính | Kết quả | Baseline (đoán lớp đa số) |
|---|---|---|---|
| **ArgKP** | Accuracy | **87.44%** | 72.61% |
| | F1 (lớp KHỚP) / Precision / Recall | **0.760 / 0.798 / 0.725** | 0 / 0 / 0 |
| | Macro-F1 | 0.837 | — |
| **Ngụy biện (6 nhóm)** | Accuracy | **57.06%** | 22.7% |
| | Macro-F1 / Weighted-F1 | **0.573 / 0.572** | ~0.06 |

> **Ghi chú độ khó:** phân loại ngụy biện vốn khó ngay cả với tiếng Anh, dữ liệu sạch (nghiên cứu công bố
> cũng chỉ ~30–50% F1). Con số 57% (gấp ~2.5× baseline) trên dữ liệu **dịch máy tiếng Việt** là hợp lý và
> sát trần dữ liệu hiện có. Báo cáo đánh giá đầy đủ: `docs/pa/PA4/PA4-Group09/KaiKo_ML_Model_Evaluation_Report_PA4.docx`.

---

## 3. Dữ liệu (`data/`)

| File | Mô tả |
|---|---|
| `ArgKP_combined.csv` | Bản gốc tiếng Anh — [IBM Debater ArgKP](https://huggingface.co/datasets/NLP-Debater-Project/IBM-Debater-ArgKP) |
| `ArgKP_combined_vi.csv` | Bản đã dịch sang tiếng Việt (cột `argument_vi`, `key_point`, `label`) |
| `logical_fallacy_vi.csv` | Dataset ngụy biện đã dịch sang tiếng Việt (cột `text_vi`, `logical_fallacies`) |

Việc dịch Anh → Việt thực hiện bằng Gemini qua 2 script: `translate_argkp.py` và `translate_dataset.py`.

---

## 4. Cấu trúc thư mục

```
ai_model/
├── README.md                  # File này
├── kaiko-train-arg.ipynb      # Notebook huấn luyện ArgKP (chạy trên Kaggle/Colab)
├── kaiko-train-fallacy.ipynb  # Notebook huấn luyện Ngụy biện (6 nhóm)
├── translate_argkp.py         # Script dịch dataset ArgKP sang tiếng Việt
├── translate_dataset.py       # Script dịch dataset ngụy biện sang tiếng Việt
└── data/                      # Dataset (gốc + đã dịch)
```

> Model sau khi train (`kaiko_argkp_model_final/`, `kaiko_fallacy_model_final/`) **không commit lên Git**
> (nặng ~400MB, đã nằm trong `.gitignore`) — tải riêng ở mục 7.

---

## 5. Huấn luyện lại (trên Kaggle / Google Colab)

1. Tạo notebook mới trên **Kaggle**, bật GPU (**T4 × 2**).
2. Upload dataset tương ứng (`ArgKP_combined_vi.csv` hoặc `logical_fallacy_vi.csv`).
3. Copy toàn bộ cell code từ notebook (`kaiko-train-arg.ipynb` / `kaiko-train-fallacy.ipynb`) vào và chạy.
4. Tải thư mục model kết quả (`kaiko_*_model_final`) về.

**Cấu hình huấn luyện chính:** `transformers==4.46.3` (đã pin — tránh lỗi nạp trọng số của transformers 5.x),
`learning_rate=2e-5`, batch 16, tối đa 10–12 epoch kèm **EarlyStopping**, `fp16`, xử lý mất cân bằng bằng
**Weighted Loss**, chọn checkpoint tốt nhất theo F1 (ArgKP) / macro-F1 (Ngụy biện). Mỗi notebook có bước
**kiểm tra tính toàn vẹn khi nạp backbone** (chỉ cho phép thiếu `classifier.*`).

---

## 6. Cách dùng trong ứng dụng

Backend (`backend/main.py`) gọi mô hình qua một **AI service** (biến môi trường `AI_SERVICE_URL`):

- `POST /predict/fallacy` → trả nhãn 1 trong 6 nhóm + độ tin cậy → hiện **FallacyAlert** trong trận.
- `POST /predict/argkp` → trả `match`/`score` → cảnh báo khi lập luận **lạc đề**.

Nếu AI service lỗi hoặc chưa cấu hình, backend **tự fallback sang Gemini** nên tính năng vẫn hoạt động.

---

## 7. Tải model đã huấn luyện

Model (`.safetensors` + tokenizer + `config.json` + `decision_threshold.json`) tải tại Google Drive:

**https://drive.google.com/drive/folders/1gxSKSbyZl95QorajZDkfKg4bI82Bnuk6**

Giải nén vào `backend/fallacy_model/kaiko_fallacy_model_final/` và `backend/fallacy_model/kaiko_argkp_model_final/`,
sau đó khởi động lại AI service / backend.
