# ==============================================================================
# SCRIPT HUẤN LUYỆN PHO-BERT (KIỂM TRA LẬP LUẬN - ARGKP) CHO KAIKO
# Dành cho Kaggle hoặc Google Colab
# ==============================================================================
# Hướng dẫn sử dụng:
# 1. Tạo một Notebook mới trên Kaggle (hoặc Google Colab).
# 2. Bật GPU (Kaggle: Settings -> Accelerator -> GPU T4 x2).
# 3. Upload file `ArgKP_combined_vi.csv` lên Kaggle.
# 4. Copy toàn bộ đoạn code này dán vào 1 cell và chạy.
# ==============================================================================

!pip install transformers datasets accelerate scikit-learn pandas torch

import pandas as pd
import numpy as np
import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    TrainingArguments, 
    Trainer
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

print("Đang chuẩn bị dữ liệu...")

# 1. Load Dataset
df = pd.read_csv('ArgKP_combined_vi.csv')

# Lọc bỏ các dòng bị lỗi dịch (rỗng)
df = df.dropna(subset=['argument_vi', 'key_point', 'label'])

# Đảm bảo label là kiểu integer (0 hoặc 1)
df['label'] = df['label'].astype(int)

print(f"Tổng số dữ liệu hợp lệ: {len(df)}")
print(df['label'].value_counts())

# Tách tập Train (80%) và Test (20%)
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['label'])

# Tạo HuggingFace Dataset
train_dataset = Dataset.from_pandas(train_df[['argument_vi', 'key_point', 'label']])
test_dataset = Dataset.from_pandas(test_df[['argument_vi', 'key_point', 'label']])

# 2. Khởi tạo Tokenizer của XLM-RoBERTa (hỗ trợ đa ngôn ngữ Việt + Anh)
MODEL_NAME = "FacebookAI/xlm-roberta-base"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

# Tokenize theo cặp câu (Sentence Pair Classification)
# Cấu trúc: <s> argument_vi </s></s> key_point </s>
def tokenize_function(examples):
    return tokenizer(
        examples["argument_vi"], 
        examples["key_point"],
        padding="max_length", 
        truncation=True, 
        max_length=256
    )

print("Đang tokenize tập Train...")
tokenized_train = train_dataset.map(tokenize_function, batched=True)
print("Đang tokenize tập Test...")
tokenized_test = test_dataset.map(tokenize_function, batched=True)

# 3. Khởi tạo Model
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME, 
    num_labels=2, # Binary Classification (1: Match, 0: Not Match)
    id2label={0: "KHONG_KHOP", 1: "KHOP"},
    label2id={"KHONG_KHOP": 0, "KHOP": 1}
)

# 4. Xử lý mất cân bằng nhãn bằng Weighted Loss
import torch.nn as nn
from torch.utils.data import DataLoader

# Tính class weight ngược tỷ lệ (nhãn hiếm sẽ được nặng hơn)
total = len(df)
count_0 = (df['label'] == 0).sum()
count_1 = (df['label'] == 1).sum()
weight_0 = total / (2 * count_0)
weight_1 = total / (2 * count_1)
class_weights = torch.tensor([weight_0, weight_1], dtype=torch.float32).cuda()
print(f"Class weights: 0={weight_0:.3f}, 1={weight_1:.3f}")

# Custom Trainer với Weighted Cross Entropy Loss
class WeightedTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits
        loss_fn = nn.CrossEntropyLoss(weight=class_weights)
        loss = loss_fn(logits, labels)
        return (loss, outputs) if return_outputs else loss

# 5. Định nghĩa hàm tính điểm (Metrics)
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    
    acc = accuracy_score(labels, predictions)
    f1 = f1_score(labels, predictions)
    precision = precision_score(labels, predictions)
    recall = recall_score(labels, predictions)
    
    return {"accuracy": acc, "f1": f1, "precision": precision, "recall": recall}

# Kiểm tra cân bằng nhãn trước khi train
print("\nPhân phối nhãn:")
print(df['label'].value_counts(normalize=True))
print()

# 5. Cấu hình Training
training_args = TrainingArguments(
    output_dir="./kaiko-argkp-model",
    learning_rate=2e-5,
    per_device_train_batch_size=32,   # Tản dụng 2x T4 GPU
    per_device_eval_batch_size=64,
    num_train_epochs=3,               # Giảm xuống 3 tránh overfit dataset nhỏ
    weight_decay=0.1,                 # Tăng regularization
    warmup_ratio=0.1,                 # Warm up 10% đầu
    fp16=True,                        # Mixed precision - tăng tốc ~2x
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",       # Chọn best model theo F1
    greater_is_better=True,
    report_to="none"
)

trainer = WeightedTrainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_test,
    processing_class=tokenizer,
    compute_metrics=compute_metrics,
)

# 6. Bắt đầu Train!
print("BẮT ĐẦU HUẤN LUYỆN (TRAINING)...")
trainer.train()

# 7. Lưu model đã train
print("Đang lưu model...")
trainer.save_model("./kaiko_argkp_model_final")
tokenizer.save_pretrained("./kaiko_argkp_model_final")

print("HOÀN THÀNH! Bạn có thể tải thư mục ./kaiko_argkp_model_final về máy.")
