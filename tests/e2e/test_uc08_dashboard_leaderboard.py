# -*- coding: utf-8 -*-
"""
UC08 – Xem Dashboard & Bảng xếp hạng (Leaderboard/ELO)
Kiểm thử tự động 2 kịch bản (yêu cầu đã đăng nhập – dùng fixture logged_in_page):
  - TC-AUTO-UC08-01: Dashboard hiển thị hồ sơ + thanh điều hướng các tab.
  - TC-AUTO-UC08-02: Mở tab BXH -> gọi API /leaderboard thành công và hiển thị bảng xếp hạng.
"""
from playwright.sync_api import Page, expect


def test_uc08_01_dashboard_loaded(logged_in_page: Page):
    """TC-AUTO-UC08-01: Sau đăng nhập, Dashboard hiển thị các tab điều hướng chính."""
    page = logged_in_page
    # Các tab điều hướng đặc trưng của Dashboard phải hiển thị
    expect(page.get_by_text("BXH", exact=True)).to_be_visible()
    expect(page.get_by_text("Lịch sử", exact=True)).to_be_visible()
    expect(page.get_by_text("Cửa hàng", exact=True)).to_be_visible()
    # Nút Đăng xuất (chỉ có ở khu vực đã đăng nhập)
    expect(page.get_by_role("button", name="Đăng xuất")).to_be_visible()


def test_uc08_02_open_leaderboard(logged_in_page: Page):
    """TC-AUTO-UC08-02: Bấm tab BXH -> backend trả /leaderboard 200 và bảng xếp hạng tải."""
    page = logged_in_page
    # Bắt response API /leaderboard ngay khi bấm vào tab BXH
    with page.expect_response("**/leaderboard") as resp_info:
        page.get_by_text("BXH", exact=True).click()
    response = resp_info.value
    # API trả về thành công
    assert response.ok, f"API /leaderboard trả mã {response.status}"
    body = response.json()
    assert body.get("success") is True, "API /leaderboard không trả success=True"
    assert "leaderboard" in body, "Thiếu trường 'leaderboard' trong phản hồi"
    # Tab BXH đã được kích hoạt (không còn ở màn Auth)
    expect(page.get_by_placeholder("Tên đăng nhập")).to_have_count(0)
