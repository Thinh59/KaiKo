# -*- coding: utf-8 -*-
"""
UC08 – Xem Dashboard & Bảng xếp hạng (Leaderboard/ELO)
Kiểm thử tự động 2 kịch bản (yêu cầu đã đăng nhập – dùng fixture logged_in_page):
  - TC-AUTO-UC08-01: Dashboard hiển thị + thanh điều hướng (mac-dock) có các mục chính.
  - TC-AUTO-UC08-02: Mở tab BXH -> gọi API /leaderboard thành công và hiển thị bảng xếp hạng.
"""
from playwright.sync_api import Page, expect


def test_uc08_01_dashboard_loaded(logged_in_page: Page):
    """TC-AUTO-UC08-01: Sau đăng nhập, Dashboard + thanh điều hướng hiển thị."""
    page = logged_in_page
    # Nút Đăng xuất chỉ có ở khu vực đã đăng nhập
    expect(page.get_by_role("button", name="Đăng xuất")).to_be_visible()
    # Thanh điều hướng (mac-dock) có các mục BXH, Lịch sử, Cửa hàng
    expect(page.locator(".mac-dock-item").filter(has_text="BXH")).to_have_count(1)
    expect(page.locator(".mac-dock-item").filter(has_text="Lịch sử")).to_have_count(1)
    expect(page.locator(".mac-dock-item").filter(has_text="Cửa hàng")).to_have_count(1)


def test_uc08_02_open_leaderboard(logged_in_page: Page):
    """TC-AUTO-UC08-02: Bấm mục BXH -> backend trả /leaderboard 200 và bảng xếp hạng tải."""
    page = logged_in_page
    bxh = page.locator(".mac-dock-item").filter(has_text="BXH")
    # Bắt response API /leaderboard ngay khi bấm vào mục BXH
    with page.expect_response("**/leaderboard") as resp_info:
        bxh.click(force=True)
    response = resp_info.value
    assert response.ok, f"API /leaderboard trả mã {response.status}"
    body = response.json()
    assert body.get("success") is True, "API /leaderboard không trả success=True"
    assert "leaderboard" in body, "Thiếu trường 'leaderboard' trong phản hồi"
