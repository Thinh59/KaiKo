# ==============================================================================
# SCRIPT HUẤN LUYỆN PHO-BERT CHO ĐỒ ÁN KAIKO (CHẠY TRÊN KAGGLE / COLAB)
# ==============================================================================
# Hướng dẫn sử dụng:
# 1. Tạo một Notebook mới trên Kaggle (hoặc Google Colab).
# 2. Bật GPU (Kaggle: Settings -> Accelerator -> GPU T4 x2).
# 3. Upload file `logical_fallacy_vi.csv` lên Kaggle.
# 4. Copy toàn bộ code này dán vào 1 ô (cell) và chạy.
# ==============================================================================

# Cài đặt thư viện cần thiết
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
from sklearn.metrics import accuracy_score, f1_score

print("Đang chuẩn bị dữ liệu...")

# 1. Load Dataset
df = pd.read_csv('logical_fallacy_vi.csv')

# Đảm bảo không có dòng rỗng
df = df.dropna(subset=['text_vi', 'logical_fallacies'])

# Lấy nhãn (fallacy) - Do cột logical_fallacies có thể chứa list string, ta lấy ngụy biện đầu tiên
# Hoặc nếu là text, ta lấy text đó làm label
df['label_text'] = df['logical_fallacies'].apply(lambda x: eval(x)[0] if '[' in str(x) else str(x))

# Chuyển nhãn thành ID (Số)
labels = df['label_text'].unique()
label2id = {label: i for i, label in enumerate(labels)}
id2label = {i: label for i, label in enumerate(labels)}

df['label'] = df['label_text'].map(label2id)

print(f"Tổng số nhãn: {len(labels)}")
print("Danh sách nhãn:", list(labels))

# Tách tập Train (80%) và Test (20%)
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['label'])

train_dataset = Dataset.from_pandas(train_df[['text_vi', 'label']])
test_dataset = Dataset.from_pandas(test_df[['text_vi', 'label']])

# 2. Khởi tạo Tokenizer của XLM-RoBERTa (hỗ trợ đa ngôn ngữ)
MODEL_NAME = "FacebookAI/xlm-roberta-base"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize_function(examples):
    return tokenizer(
        examples["text_vi"], 
        padding="max_length", 
        truncation=True, 
        max_length=256
    )

tokenized_train = train_dataset.map(tokenize_function, batched=True)
tokenized_test = test_dataset.map(tokenize_function, batched=True)

# 3. Khởi tạo Model
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME, 
    num_labels=len(labels),
    id2label=id2label,
    label2id=label2id
)

# 4. Xử lý mất cân bằng nhãn bằng Weighted Loss
import torch.nn as nn
from torch.utils.data import DataLoader

# Tính class weights cho multi-class
total = len(df)
num_classes = len(labels)
weights = []
for i in range(num_classes):
    count_i = (df['label'] == i).sum()
    weight_i = total / (num_classes * count_i) if count_i > 0 else 0
    weights.append(weight_i)

class_weights = torch.tensor(weights, dtype=torch.float32).cuda()
print(f"Class weights: {weights}")

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
    f1 = f1_score(labels, predictions, average='weighted')
    return {"accuracy": acc, "f1": f1}

# Kiểm tra cân bằng nhãn
print("\nPhân phối nhãn:")
print(df['label'].value_counts(normalize=True))
print()

# 5. Cấu hình Training
training_args = TrainingArguments(
    output_dir="./kaiko-phobert-fallacy",
    learning_rate=2e-5,
    per_device_train_batch_size=32,   # Tản dụng 2x T4 GPU
    per_device_eval_batch_size=64,
    num_train_epochs=3,               # Giảm xuống 3 tránh overfit
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
    processing_class=tokenizer, # Dùng processing_class thay cho tokenizer ở bản mới
    compute_metrics=compute_metrics,
)

# 6. Bắt đầu Train!
print("BẮT ĐẦU HUẤN LUYỆN (TRAINING)...")
trainer.train()

# 7. Lưu model đã train
print("Đang lưu model...")
trainer.save_model("./kaiko_fallacy_model_final")
tokenizer.save_pretrained("./kaiko_fallacy_model_final")

print("HOÀN THÀNH! Bạn có thể tải thư mục ./kaiko_fallacy_model_final về máy.")
