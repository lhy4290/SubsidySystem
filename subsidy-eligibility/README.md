# 補助受理資格驗證 API

全國補助線上申請平台的後端 API，負責判斷使用者申請的補助類別目前是否可以受理。

- Java 17 + Spring Boot 3.5 + Maven
- JUnit 5，共 74 個測試

## 執行方式

```bash
mvn test              # 執行測試
mvn spring-boot:run   # 啟動，監聽 http://localhost:8080
```

身分證字號雜湊用的 salt 從環境變數 `SUBSIDY_NATIONAL_ID_SALT` 讀取；沒有設定時使用開發用的預設值。

## API

兩支 API 的請求與回應格式相同：

| API | 用途 | 是否寫入紀錄 |
|---|---|---|
| `POST /api/v1/subsidies/eligibility` | 查詢是否可受理 | 否，只讀 |
| `POST /api/v1/subsidies/applications` | 送出申請 | 通過檢查後寫入受理紀錄 |

拆成兩支的原因：如果查詢不寫入紀錄，「本月已申請」的檢查永遠不會觸發；如果查詢就寫入，使用者查第二次就會被判成重複申請。

### 請求

```json
{
  "subsidyType": "SPORTS",
  "birthDate":   "1998-05-20",
  "nationalId":  "A123456789"
}
```

`subsidyType` 可以是 `RENT`、`APPLIANCE`、`TRAVEL`、`SPORTS`，大小寫都接受。

### 回應

```json
{
  "eligible": false,
  "reasonCode": "OUT_OF_APPLICATION_PERIOD",
  "message": "此補助類別目前不在本月受理期間",
  "checkedAt": "2026-11-16T17:45:23+08:00",
  "nextAvailableAt": "2026-12-01T09:00:00+08:00"
}
```

- `eligible` 就是題目要求的 Boolean 回傳值。
- 業務上不受理一律回 HTTP 200，原因看 `reasonCode`；只有 JSON 本身格式錯誤才回 400。
- `nextAvailableAt` 只在時段外、受理期間外、本月已受理時提供。前兩者為同時符合開放時段與受理日期的最早時間點；本月已受理為下個月第一個受理日 09:00。

### curl 範例

```bash
curl -X POST http://localhost:8080/api/v1/subsidies/eligibility \
  -H "Content-Type: application/json" \
  -d '{"subsidyType":"SPORTS","birthDate":"1998-05-20","nationalId":"A123456789"}'
```

PowerShell：

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/subsidies/eligibility `
  -ContentType "application/json" `
  -Body '{"subsidyType":"SPORTS","birthDate":"1998-05-20","nationalId":"A123456789"}'
```

**注意**：API 使用真實時間，不同時間呼叫會得到不同結果。每月 11–14 日、26–31 日沒有任何類別開放，每天 18:00 之後全部不受理。

## 驗證順序

遇到第一個失敗就回傳：

| 順序 | reasonCode | 檢查內容 |
|---|---|---|
| 1 | `INVALID_SUBSIDY_TYPE` | 類別是否為已知代碼 |
| 2 | `INVALID_BIRTH_DATE` | yyyy-MM-dd、真實存在的日期、不能是未來日期 |
| 3 | `INVALID_NATIONAL_ID` | 身分證字號格式與檢查碼 |
| 4 | `UNDER_AGE` | 申請當天是否年滿 20 歲 |
| 5 | `OUT_OF_SERVICE_HOURS` | 是否在 09:00–18:00 之間 |
| 6 | `OUT_OF_APPLICATION_PERIOD` | 當天是否在該類別的受理期間 |
| 7 | `ALREADY_APPLIED_THIS_MONTH` | 同一人、同一類別、同一年月是否已受理 |
| — | `ELIGIBLE` | 全部通過 |

受理期間：

| 類別 | 代碼 | 每月受理日 |
|---|---|---|
| 租金補貼 | `RENT` | 1–10 日 |
| 家電補助 | `APPLIANCE` | 2–5 日 |
| 旅遊補助 | `TRAVEL` | 1–5 日 |
| 運動補助 | `SPORTS` | 15–25 日 |

## 設計假設

| 項目 | 假設 | 理由 |
|---|---|---|
| 時區 | 一律以 `Asia/Taipei` 判斷 | 題目寫「本地時間」；伺服器時區可能是 UTC，用錯會讓時段判斷偏 8 小時 |
| 開放時段 | 左閉右開：`09:00:00 ≤ t < 18:00:00`，18:00:00 整不受理 | 「18:00 截止」通常指 18:00 起不再受理 |
| 受理日期 | 兩端都包含，例如租金補貼 1 日和 10 日都可以申請 | 照題目字面 |
| 滿 20 歲 | 生日當天即滿 20 歲 | 民法第 124 條年齡自出生日起算 |
| 2/29 出生 | 非閏年以 3/1 視為生日 | 民法第 121 條「無相當日者以其月之末日為期間末日」；Java `Period` 的行為相同。1900–2100 年間，20 歲生日落在非閏年的只有 2080 → 2100 這一種情況 |
| 類別大小寫 | `"rent"` 視為 `RENT` | 降低前端傳值錯誤造成的客訴 |
| 身分證字號空白 | 先 `strip()` 去除前後空白，包含全形空白 | 中文輸入法常打出全形空白；`trim()` 去不掉 |
| 欄位為 null 或空白 | 回 200 + 對應的 `INVALID_*` | 避免拋例外變成 500 |
| 重複申請 | 唯一鍵 `(身分證雜湊, 類別, 年月)`，只記錄「受理」的申請 | 題目要求檢驗當月是否已受理 |
| 新式居留證 | 未支援（第二碼 8、9 會被拒絕） | 題目為選做 |

### 簡報素材的假設（`deliverables/`）

| 項目 | 假設 | 理由 |
|---|---|---|
| 排隊太久 | 等候超過 30 分鐘即視為太久，保留號碼牌、允許先離開 | 題目未定義門檻；30 分鐘後讓使用者不必守在畫面前 |
| 登入與戶籍地 | 以自然人憑證或 TW FidO 登入；登入時向內政部戶政查詢一次戶籍地，供地區分流使用 | 地區分流依戶籍地，不由使用者自填，也不用裝置定位 |
| 資料保存期限 | 受理紀錄：核撥完成後 5 年；稽核 log：1 年；來源 IP：6 個月；Kafka 中的身分證明碼：7 天 | 題目未規定；正式上線以主管機關公告的檔案保存年限為準 |
| 題二情境 | 上線前 2 週，國土署要求租金補貼受理日由 1–10 日延長到 1–15 日，另一部會反對；出事情境為參數誤設為 1–5 日 | 題目允許自行假設情境 |
| Feature Flag | 只有設計、未實作；本實作修改受理日仍需重新部署 | 正式環境把 `SubsidyType` 的受理日期移到設定檔，再以旗標切換新舊規則 |

## 個資保護

| 做法 | 位置 |
|---|---|
| 用 POST 不用 GET，身分證字號不出現在 URL，不會被寫進 access log | `EligibilityController` |
| 資料庫只存身分證字號的雜湊值，不存明碼；雜湊前先正規化，換大小寫無法繞過重複檢查 | `NationalIdHasher`、`EligibilityService` |
| log 只記遮罩後的身分證字號（`A12****789`），不記生日；遮罩可處理任意輸入，不會拋例外 | `PiiMasker` |
| JSON 格式錯誤時，回應和 log 都不帶 Jackson 的例外訊息，因為它會帶出原始輸入 | `GlobalExceptionHandler` |

## 實作上的關鍵決策

- **DTO 欄位全部用 String**：用 enum 或 `LocalDate` 的話，格式錯誤會在 Jackson 反序列化時變成 400，回不了 `INVALID_SUBSIDY_TYPE`、`INVALID_BIRTH_DATE`。
- **生日用 `LocalDate.parse` 解析**：`ofPattern("yyyy-MM-dd")` 會把 `2023-02-29` 默默改成 `2023-02-28`。
- **注入 `Clock`，每個請求只讀一次時間**：時間邏輯才能寫測試，所有檢查也用同一個時間點。
- **重複申請用原子寫入判斷**：Repository 的 `tryRecord` 直接寫入，已存在就回 false。實測先查詢再寫入時，查詢和寫入之間只要隔 1 ms，同一人同時送出的 2 個請求在 300 次試驗中 300 次都會被重複受理。
- **受理日期寫成 enum 的資料**：規則調整只改 `SubsidyType` 一處，日後可改為從設定檔或 DB 讀取。

## 正式環境考量

本實作為範例，以下項目未實作：

| 項目 | 現況 | 正式環境做法 |
|---|---|---|
| 受理紀錄 | 記憶體 `ConcurrentHashMap` | DB 資料表，在 `(national_id_hash, subsidy_type, year_month)` 建唯一鍵約束 |
| 身分證雜湊 | SHA-256 + 固定 salt | HMAC-SHA256，金鑰放在 KMS 與資料庫分開保管。實測：取得 salt 與雜湊值後，筆電 CPU 用 33.9 秒就還原出身分證字號；全台約 5.2 億個合法字號，最多 2.9 分鐘就能全部試完 |
| 身分驗證 | 無，任何人可查任何身分證字號 | 先以自然人憑證、TW FidO 等登入，身分證字號從登入憑證取得，不從請求內容取得 |
| 生日 | 使用者自行填寫 | 向內政部戶政系統驗證生日與身分證字號是否相符 |
| 補助類別路由 | 類別放在 request body | API Gateway 依類別路由時，可改為放在路徑（`/subsidies/{type}/...`），Gateway 不必解析 body |

## 專案結構

```
src/main/java/com/example/subsidy/
├── SubsidyApplication.java                # 進入點、Clock bean
├── controller/EligibilityController.java  # 兩支 API
├── controller/GlobalExceptionHandler.java # JSON 錯誤回 400，不洩漏原始內容
├── dto/EligibilityRequest.java
├── dto/EligibilityResponse.java
├── domain/SubsidyType.java                # 類別與受理日期
├── domain/ReasonCode.java                 # 原因代碼與中文訊息
├── service/EligibilityService.java        # 核心驗證邏輯
├── validation/NationalIdValidator.java    # 身分證字號格式與檢查碼
├── repository/ApplicationRepository.java
├── repository/InMemoryApplicationRepository.java
├── util/NationalIdHasher.java
└── util/PiiMasker.java
```

## 開發環境備註

Spring Boot 3.3.5 的 `spring-boot:run` 在 Windows 上，專案路徑含中文時會啟動失敗（找不到主類別）：classpath 寫進 argfile 時編碼和 JVM 讀取時不一致。升級到 3.5.0 後正常。
