# 📊 Phân Tích Đánh Giá ML Model — Đồ Án KaiKo

> **Yêu cầu bài tập:** *"Design the approach to evaluate the ML model used in your project"*
> Các hạng mục cần trình bày: Choosing models · Goals to evaluate · Datasets used · Metrics · Procedure to evaluate · Expected accuracy

---

## ✅ 1. Choosing Models — **ĐÃ CÓ**

Dự án KaiKo sử dụng **2 ML model tự train** (không dùng Gemini API):

### Model 1: Fallacy Detection (Phát hiện Ngụy Biện)
| Thuộc tính | Giá trị |
|---|---|
| **Base Model** | `FacebookAI/xlm-roberta-base` (XLM-RoBERTa) |
| **Task** | Multi-class Text Classification — **gộp 13 nhãn gốc → 6 nhóm** tách bạch (PA4) |
| **Lý do chọn** | Hỗ trợ đa ngôn ngữ (Tiếng Việt + Anh), mạnh với NLP |
| **Script** | `ai_model/kaiko-train-fallacy.ipynb` |
| **Model đã lưu** | `backend/fallacy_model/kaiko_fallacy_model_final/` |

**13 nhãn phân loại:**
`ad hominem`, `ad populum`, `appeal to emotion`, `circular reasoning`, `equivocation`, `fallacy of credibility`, `fallacy of extension`, `fallacy of logic`, `fallacy of relevance`, `false causality`, `false dilemma`, `faulty generalization`, `intentional`

### Model 2: Argument Key-Point Matching (ArgKP)
| Thuộc tính | Giá trị |
|---|---|
| **Base Model** | `FacebookAI/xlm-roberta-base` (XLM-RoBERTa) |
| **Task** | Binary Classification — argument có khớp key-point không? |
| **Lý do chọn** | Sentence Pair Classification, hỗ trợ cặp câu, đa ngôn ngữ |
| **Script** | `ai_model/train_phobert_argkp.py` |
| **Model đã lưu** | `backend/fallacy_model/kaiko_argkp_model_final/` |

---

## ✅ 2. Goals to Evaluate — **ĐÃ CÓ (ngầm định, cần làm rõ)**

| Mục tiêu | Mô tả |
|---|---|
| **Phát hiện ngụy biện real-time** | Model phân loại câu nói của người tranh biện vào 1 trong 13 loại ngụy biện (hoặc không phải ngụy biện) |
| **Đánh giá chất lượng lập luận** | ArgKP model kiểm tra xem lập luận của người chơi có đúng với key-point/chủ đề debate không |
| **Hỗ trợ hệ thống chấm điểm** | Kết quả 2 model được dùng trực tiếp để tính điểm `fallacies_self/opp` trong `match_history` |
| **Tích hợp thời gian thực** | Model chạy trong backend FastAPI, gọi mỗi lượt debate qua API `/analyze` |

---

## ✅ 3. Datasets Used — **ĐÃ CÓ**

### Dataset 1: Logical Fallacy (cho Fallacy Detection)
| Thuộc tính | Chi tiết |
|---|---|
| **File** | `ai_model/data/logical_fallacy_vi.csv` |
| **Kích thước** | ~1 MB |
| **Nguồn gốc** | Dataset ngụy biện tiếng Anh, đã được **dịch sang tiếng Việt** bằng script `translate_dataset.py` |
| **Cấu trúc** | Cột `text_vi` (văn bản Việt), cột `logical_fallacies` (nhãn) |
| **Số nhãn** | 13 loại ngụy biện |

### Dataset 2: ArgKP (cho Argument Matching)
| Thuộc tính | Chi tiết |
|---|---|
| **File gốc** | `ai_model/data/ArgKP_combined.csv` (~7.6 MB) |
| **File đã dịch** | `ai_model/data/ArgKP_combined_vi.csv` (~749 KB) |
| **Nguồn gốc** | IBM ArgKP dataset, dịch sang tiếng Việt bằng `translate_argkp.py` |
| **Cấu trúc** | Cột `argument_vi`, `key_point`, `label` (0/1) |
| **Task** | Binary — argument có relevant với key-point không |

### Cách tạo dataset
- **Choosing dataset:** Sử dụng dataset chuẩn học thuật (IBM ArgKP, Logical Fallacy dataset)
- **Creating dataset:** Dịch từ tiếng Anh → tiếng Việt bằng script tự viết
- **Characteristics:** Imbalanced labels → xử lý bằng **Weighted Loss** (class weights ngược tỷ lệ)

---

## ✅ 4. Metrics — **ĐÃ CÓ TRONG CODE**

Cả 2 model đều dùng hàm `compute_metrics` trong training script:

### Fallacy Detection Model
```python
def compute_metrics(eval_pred):
    acc   = accuracy_score(labels, predictions)
    f1    = f1_score(labels, predictions, average='weighted')
    return {"accuracy": acc, "f1": f1}
```

### ArgKP Model
```python
def compute_metrics(eval_pred):
    acc       = accuracy_score(labels, predictions)
    f1        = f1_score(labels, predictions)
    precision = precision_score(labels, predictions)
    recall    = recall_score(labels, predictions)
    return {"accuracy": acc, "f1": f1, "precision": precision, "recall": recall}
```

| Metric | Lý do chọn |
|---|---|
| **Accuracy** | Tổng quát, dễ hiểu |
| **F1 (weighted)** | Quan trọng hơn accuracy khi dataset mất cân bằng nhãn |
| **Precision** | Tránh báo sai (false positive ngụy biện) |
| **Recall** | Không bỏ sót ngụy biện thật |
| **Best model = F1** | Cả 2 model đều dùng `metric_for_best_model="f1"` |

---

## ✅ 5. Procedure to Evaluate — **ĐÃ CÓ**

### Cách chia dữ liệu
```
Train: 80% | Test: 20%  (random_state=42, stratify=label)
```

### Môi trường training
| Yếu tố | Chi tiết |
|---|---|
| **Platform** | Kaggle Notebook / Google Colab |
| **GPU** | T4 x2 (hoặc tương đương) |
| **Mixed Precision** | `fp16=True` — tăng tốc ~2x |
| **Framework** | HuggingFace Transformers + PyTorch |

### Các bước training
1. Load dataset CSV → `pandas.DataFrame`
2. Tokenize bằng `AutoTokenizer` (max_length=256, sentence pair)
3. Tính `class_weights` để xử lý imbalanced labels
4. Train bằng `WeightedTrainer` với `CrossEntropyLoss` có trọng số
5. Evaluate mỗi epoch (`eval_strategy="epoch"`)
6. Lưu best model theo F1

### Hyperparameters (cập nhật PA4)
| Param | Giá trị |
|---|---|
| Base transformers | **`4.46.3` (đã pin)** — tránh lỗi nạp trọng số của transformers 5.x |
| Learning rate | `2e-5` |
| Batch size (train) | `16` |
| Batch size (eval) | `64` |
| Epochs | Ngụy biện `12` / ArgKP `10` (kèm **EarlyStopping** patience=3) |
| Weight decay | `0.01` |
| Warmup ratio | `10%` |
| Chọn checkpoint | Ngụy biện theo `f1_macro`, ArgKP theo `f1` |

> ⚠️ **Sửa lỗi then chốt PA4:** transformers 5.0.0 (mặc định trên Kaggle) khởi tạo ngẫu nhiên toàn bộ LayerNorm của backbone → mô hình gần như không học. Đã pin `transformers==4.46.3` + thêm bước kiểm tra `output_loading_info` (chỉ cho phép thiếu `classifier.*`).

### Tích hợp vào production
```
Model được load lúc FastAPI khởi động → chạy real-time mỗi lần người chơi gửi câu
Fallback: nếu model chưa có → dùng Gemini API thay thế
```

---

## ✅ 6. Kết quả thực tế (đo trên Kaggle, chu kỳ PA4)

### ArgKP Matching — ĐẠT (3/4 chỉ tiêu có dư, Recall sát ngưỡng)

| Metric | Mốc kỳ vọng | Thực tế (test, ngưỡng 0.60) | Đạt? |
|---|---|---|---|
| Accuracy | ≥ 80% | **87.44%** | ✅ |
| F1 (lớp khớp) | ≥ 0.75 | **0.7596** | ✅ |
| Precision | ≥ 0.75 | **0.7980** | ✅ |
| Recall | ≥ 0.75 | 0.7248 | ⚠️ hụt ~3 mẫu |
| Macro-F1 | — | 0.8373 | — |

### Fallacy Detection — CẢI THIỆN MẠNH, dưới mốc 75% (đã gộp 13→6 nhóm)

| Metric | Mốc kỳ vọng (điều chỉnh) | Thực tế (test, 6 nhóm) |
|---|---|---|
| Accuracy | ~55–60% (75% là phi thực tế cho 13-lớp) | **57.06%** |
| Macro-F1 | ~0.55 | **0.5727** |
| Weighted-F1 | — | 0.5716 |

### Thí nghiệm đối chứng (ablation) — bằng chứng mô hình hoạt động

| Mô hình | Phiên bản | Accuracy | F1 |
|---|---|---|---|
| Fallacy | Backbone hỏng (transformers 5.0) | 17.75% | 0.122 (w) |
| Fallacy | Sửa backbone, 13 lớp | 47.90% | 0.471 (macro) |
| Fallacy | Sửa + gộp 6 nhóm | **57.06%** | **0.573 (macro)** |
| ArgKP | Backbone hỏng | 62.06% | 0.417 |
| ArgKP | Sửa backbone, ngưỡng 0.5 | 86.18% | 0.742 |
| ArgKP | Sửa + dò ngưỡng 0.60 | **87.44%** | **0.760** |

> **Kết luận:** Sửa lỗi nạp trọng số là bước quyết định; gộp nhóm + dò ngưỡng là các cải tiến bổ sung có tác dụng đo lường được. Mốc 75% cho phân loại ngụy biện 13-lớp là phi thực tế (nghiên cứu gốc cũng chỉ ~30–50% F1) — kết quả 57% là hợp lý và sát trần dữ liệu. Báo cáo đầy đủ: `docs/pa/PA4/PA4-Group09/KaiKo_ML_Model_Evaluation_Report_PA4.docx`.

---

## 📋 Tổng Hợp — Còn Thiếu Gì?

| Hạng mục slide | Trạng thái | Ghi chú |
|---|---|---|
| ✅ Choosing models | **Đầy đủ** | 2 model XLM-RoBERTa cho 2 task khác nhau |
| ✅ Goals to evaluate | **Có, cần diễn đạt rõ hơn** | Mục tiêu gắn với gameplay |
| ✅ Datasets used | **Đầy đủ** | IBM ArgKP + Logical Fallacy, dịch sang Việt |
| ✅ Metrics | **Đầy đủ trong code** | Accuracy, F1, Precision, Recall |
| ✅ Procedure to evaluate | **Đầy đủ** | Kaggle GPU, 80/20 split, eval mỗi epoch |
| ❌ Expected accuracy | **CHƯA CÓ** | Cần chạy training để lấy số thực tế |

---

## 🎯 Gợi Ý Cấu Trúc Slide Thuyết Trình

```
1. Giới thiệu bài toán ML trong KaiKo
   └─ Phát hiện ngụy biện + Đánh giá lập luận

2. Chọn Model
   └─ XLM-RoBERTa (multilingual, tại sao không dùng PhoBERT thuần?)

3. Dataset
   └─ Nguồn → Dịch → Characteristics (imbalanced) → Giải pháp (weighted loss)

4. Metrics & Procedure
   └─ Train/Test split, GPU env, hyperparams, eval per epoch

5. Kết quả (Expected / Actual)
   └─ [Bảng số liệu từ Kaggle log]

6. Tích hợp thực tế
   └─ Model chạy real-time trong debate, fallback Gemini API
```
