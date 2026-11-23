# 程式碼截圖

| 檔案 | 內容 |
|---|---|
| `api-entry.png` | API 入口：`EligibilityController` 兩支 API、`EligibilityRequest` 三個 String 輸入、`EligibilityResponse` 產生 Boolean 的位置 |
| `eligibility-service.png` | `EligibilityService.evaluate`：7 道檢查的回傳行以綠底標示，由上而下即驗證順序 |
| `national-id-validator.png` | `NationalIdValidator`：正規化、格式、檢查碼（略過私有建構子，以 ⋮ 標示） |

截圖直接讀取 `subsidy-eligibility` 的原始碼，行號與原始檔一致；以方法名稱定位起訖行，程式修改後重新執行即可。

## 重新產生

需要 Node.js 與 Mermaid CLI（其內含 puppeteer）。

```powershell
cd deliverables\code-screenshots
npm install
node codeshot.cjs (Join-Path (npm root -g) '@mermaid-js\mermaid-cli\node_modules')
```
