KaiKo – Katalon Web UI test scripts (PA5a)
Selector lấy trực tiếp từ source frontend, khớp giao diện thật:
  - Vào form đăng nhập: nút "Start Now" (button.btn-play-shine) trên HomePage
  - Ô nhập: placeholder "Tên đăng nhập" / "Mật khẩu"; nút đăng nhập: button[type=submit]
  - Dashboard: thanh dock (.mac-dock); item điều hướng nhận diện qua icon alt="Lịch sử" / alt="BXH"
    (label hiển thị CHỮ HOA nên KHÔNG match bằng text thường)
Dùng: tạo Test Case -> tab Script -> dán nội dung .groovy -> Run bằng Chrome.
Cần tạo trước tài khoản test trên app (mặc định kaiko_test / Test@123) hoặc đổi ở đầu file.
