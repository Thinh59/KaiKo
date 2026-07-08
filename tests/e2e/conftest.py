# -*- coding: utf-8 -*-
"""
Cấu hình chung cho bộ kiểm thử tự động KaiKo (Playwright + pytest).

Biến môi trường (có giá trị mặc định, chỉnh nếu cần):
  KAIKO_BASE_URL   URL frontend đang chạy   (mặc định http://localhost:5173)
  KAIKO_TEST_USER  Tài khoản test hợp lệ    (mặc định kaiko_test)
  KAIKO_TEST_PASS  Mật khẩu test hợp lệ     (mặc định Test@1234)

Tài khoản test phải tồn tại trong DB trước khi chạy (đăng ký 1 lần qua UI/Đăng ký),
hoặc đặt KAIKO_TEST_USER/PASS trỏ tới tài khoản có sẵn.
"""
import os
import pytest
from playwright.sync_api import Page, expect

BASE_URL = os.getenv("KAIKO_BASE_URL", "http://localhost:5173")
TEST_USER = os.getenv("KAIKO_TEST_USER", "kaiko_test")
TEST_PASS = os.getenv("KAIKO_TEST_PASS", "Test@1234")

# Thời gian chờ mặc định cho các assertion (ms)
DEFAULT_TIMEOUT = 15_000


@pytest.fixture(autouse=True)
def _set_timeout(page: Page):
    """Đặt timeout mặc định cho mọi test."""
    page.set_default_timeout(DEFAULT_TIMEOUT)
    yield


def goto_auth(page: Page):
    """Mở trang chủ và bấm 'Start Now' để tới màn Đăng nhập."""
    page.goto(BASE_URL, wait_until="domcontentloaded")
    # Nút 'Start Now' đưa người dùng chưa đăng nhập tới màn Auth
    page.get_by_role("button", name="Start Now").first.click()
    # Xác nhận đã ở form Đăng nhập KaiKo
    expect(page.get_by_placeholder("Tên đăng nhập")).to_be_visible()


def do_login(page: Page, username: str, password: str):
    """Điền form đăng nhập KaiKo và bấm Đăng Nhập."""
    goto_auth(page)
    page.get_by_placeholder("Tên đăng nhập").fill(username)
    page.get_by_placeholder("Mật khẩu").fill(password)
    page.get_by_role("button", name="Đăng Nhập").click()


@pytest.fixture
def logged_in_page(page: Page) -> Page:
    """Trả về 1 page đã đăng nhập thành công, đang ở Dashboard."""
    do_login(page, TEST_USER, TEST_PASS)
    # Dashboard hiển thị khi thấy nút 'Đăng xuất'
    expect(page.get_by_role("button", name="Đăng xuất")).to_be_visible()
    return page
