import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.testobject.ConditionType
import com.kms.katalon.core.model.FailureHandling

// Helper: tạo TestObject động từ XPath (không cần Object Repository)
TestObject xp(String xpath) {
    TestObject to = new TestObject(xpath)
    to.addProperty("xpath", ConditionType.EQUALS, xpath)
    return to
}

final String URL = "https://kai-ko.vercel.app/"
// Selector lấy trực tiếp từ source code frontend (AuthPage.jsx / HomePage.jsx / Dashboard.jsx)
final String PLAY_BTN   = "(//button[contains(@class,'btn-play-shine')])[1]"     // nút "Start Now"
final String IN_USER    = "//input[@placeholder='Tên đăng nhập']"
final String IN_PASS    = "//input[@placeholder='Mật khẩu']"
final String BTN_SUBMIT = "//button[@type='submit']"                             // nút "Đăng Nhập"
final String DASH_DOCK  = "//div[contains(@class,'mac-dock')]"                   // thanh điều hướng Dashboard
final String DOCK_HIST  = "//div[contains(@class,'mac-dock-item') and .//img[@alt='Lịch sử']]"
final String DOCK_BXH   = "//div[contains(@class,'mac-dock-item') and .//img[@alt='BXH']]"

// ===== TC_UC08_01 – Xem lịch sử trận đấu =====
final String USERNAME = "kaiko_test"
final String PASSWORD = "Test@123"

WebUI.openBrowser("")
WebUI.maximizeWindow()
WebUI.navigateToUrl(URL)

// Đăng nhập (tiền điều kiện)
WebUI.waitForElementClickable(xp(PLAY_BTN), 20)
WebUI.click(xp(PLAY_BTN))
WebUI.waitForElementVisible(xp(IN_USER), 15)
WebUI.setText(xp(IN_USER), USERNAME)
WebUI.setText(xp(IN_PASS), PASSWORD)
WebUI.click(xp(BTN_SUBMIT))
WebUI.waitForElementVisible(xp(DASH_DOCK), 20)

// Mở tab Lịch sử
WebUI.click(xp(DOCK_HIST))

// Kỳ vọng: tiêu đề "Lịch sử trận đấu" hiển thị
WebUI.waitForElementVisible(xp("//h2[contains(.,'Lịch sử trận đấu')]"), 15)
WebUI.verifyElementVisible(xp("//h2[contains(.,'Lịch sử trận đấu')]"))

WebUI.closeBrowser()
