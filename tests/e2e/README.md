# KaiKo – Kiểm thử tự động (PA5)

Bộ kiểm thử tự động end-to-end bằng **Playwright (Python) + pytest**, phủ 2 use-case × 2 kịch bản:

| Test Case ID | Use case | Kịch bản |
|---|---|---|
| TC-AUTO-UC01-01 | UC01 – Đăng nhập | Đăng nhập hợp lệ → vào Dashboard |
| TC-AUTO-UC01-02 | UC01 – Đăng nhập | Sai mật khẩu → hiện thông báo lỗi |
| TC-AUTO-UC08-01 | UC08 – Dashboard/BXH | Dashboard hiển thị các tab điều hướng |
| TC-AUTO-UC08-02 | UC08 – Dashboard/BXH | Mở tab BXH → API `/leaderboard` trả về bảng xếp hạng |

## 1. Chuẩn bị

```bash
# (khuyến nghị) tạo virtualenv riêng
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
python -m playwright install chromium
```

## 2. Chạy ứng dụng cần test (2 terminal riêng)

```bash
# Terminal 1 – backend
cd backend
uvicorn main:app --port 8000

# Terminal 2 – frontend
cd frontend
npm run dev        # chạy ở http://localhost:5173
```

Tạo sẵn 1 tài khoản test (đăng ký 1 lần qua giao diện) rồi khai báo cho test:

```bash
# Windows (PowerShell)
$env:KAIKO_TEST_USER="kaiko_test"; $env:KAIKO_TEST_PASS="Test@1234"
# macOS/Linux
export KAIKO_TEST_USER=kaiko_test KAIKO_TEST_PASS=Test@1234
```

Biến môi trường hỗ trợ (đều có mặc định):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `KAIKO_BASE_URL` | `http://localhost:5173` | URL frontend |
| `KAIKO_TEST_USER` | `kaiko_test` | Tài khoản test hợp lệ |
| `KAIKO_TEST_PASS` | `Test@1234` | Mật khẩu test hợp lệ |

## 3. Chạy test

```bash
cd tests/e2e

# Chạy hiển thị trình duyệt (dễ quay demo)
pytest --headed

# Chạy ngầm (headless)
pytest

# Chạy chậm lại để quan sát khi trình bày
pytest --headed --slowmo 800
```

Kết quả Pass/Fail in ra terminal và xuất file **`report.html`** (mở bằng trình duyệt) để đính kèm báo cáo PA5.

> Ghi chú: các test điều hướng bằng thao tác click thực tế (không dùng URL) vì KaiKo là SPA quản lý màn hình bằng state. Test UC08-02 xác minh cả luồng UI → API `/leaderboard` → dữ liệu, nên cần backend chạy.
