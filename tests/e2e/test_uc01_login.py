# -*- coding: utf-8 -*-
"""
UC01 – Đăng nhập (Login)
Kiểm thử tự động 2 kịch bản:
  - TC-AUTO-UC01-01: Đăng nhập THÀNH CÔNG với tài khoản hợp lệ -> vào Dashboard.
  - TC-AUTO-UC01-02: Đăng nhập THẤT BẠI với sai mật khẩu -> hiện thông báo lỗi, ở lại màn Auth.
"""
from playwright.sync_api import Page, expect

from conftest import goto_auth, do_login, TEST_USER, TEST_PASS


def test_uc01_01_login_success(logged_in_page: Page):
    """TC-AUTO-UC01-01: Đăng nhập hợp lệ -> Dashboard hiển thị (có nút Đăng xuất)."""
    page = logged_in_page
    # Đã vào Dashboard: nút Đăng xuất phải hiển thị (fixture đã đảm bảo, kiểm tra lại)
    expect(page.get_by_role("button", name="Đăng xuất")).to_be_visible()
    # Form đăng nhập không còn nữa
    expect(page.get_by_placeholder("Tên đăng nhập")).to_have_count(0)


def test_uc01_02_login_wrong_password(page: Page):
    """TC-AUTO-UC01-02: Sai mật khẩu -> thông báo 'Sai tài khoản hoặc mật khẩu'."""
    do_login(page, TEST_USER, "sai_mat_khau_123")
    # Backend trả error 'Sai tài khoản hoặc mật khẩu' -> AuthPage hiển thị
    expect(page.get_by_text("Sai tài khoản hoặc mật khẩu")).to_be_visible()
    # Vẫn ở màn đăng nhập (form còn đó), KHÔNG vào Dashboard
    expect(page.get_by_placeholder("Tên đăng nhập")).to_be_visible()
    expect(page.get_by_role("button", name="Đăng xuất")).to_have_count(0)
