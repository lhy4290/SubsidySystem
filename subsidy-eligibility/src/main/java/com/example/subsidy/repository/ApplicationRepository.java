package com.example.subsidy.repository;

import com.example.subsidy.domain.SubsidyType;

import java.time.YearMonth;

/**
 * 受理紀錄。唯一鍵：(nationalIdHash, subsidyType, yearMonth)。
 * 正式環境對應 DB 資料表，於上述三欄建立唯一鍵約束。
 */
public interface ApplicationRepository {

    record ApplicationKey(String nationalIdHash, SubsidyType subsidyType, YearMonth yearMonth) {
    }

    /** 查詢用，唯讀 */
    boolean exists(ApplicationKey key);

    /**
     * 送件用原子寫入：成功回 true，鍵已存在回 false，為重複申請之最終判定。
     * 不得以 exists() 後再寫入取代，併發請求會同時通過檢查。
     */
    boolean tryRecord(ApplicationKey key);
}
