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

// ===== TC_UC01_02 – Đăng nhập với mật khẩu sai =====
final String USERNAME = "kaiko_test"
final String WRONG_PW = "SaiMatKhau999"

WebUI.openBrowser("")
WebUI.maximizeWindow()
WebUI.navigateToUrl(URL)

WebUI.waitForElementClickable(xp(PLAY_BTN), 20)
WebUI.click(xp(PLAY_BTN))
WebUI.waitForElementVisible(xp(IN_USER), 15)
WebUI.setText(xp(IN_USER), USERNAME)
WebUI.setText(xp(IN_PASS), WRONG_PW)
WebUI.click(xp(BTN_SUBMIT))

// Chờ backend phản hồi
WebUI.delay(3)

// Kỳ vọng: KHÔNG vào Dashboard, vẫn ở màn đăng nhập
WebUI.verifyElementNotPresent(xp(DASH_DOCK), 3, FailureHandling.CONTINUE_ON_FAILURE)
WebUI.verifyElementVisible(xp(IN_USER))

WebUI.closeBrowser()
