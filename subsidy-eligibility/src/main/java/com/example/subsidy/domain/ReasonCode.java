package com.example.subsidy.domain;

/** 驗證結果代碼；宣告順序與檢查順序一致 */
public enum ReasonCode {
    INVALID_SUBSIDY_TYPE("查無此補助類別"),
    INVALID_BIRTH_DATE("出生年月日須為 yyyy-MM-dd 格式的有效日期，且不可為未來日期"),
    INVALID_NATIONAL_ID("身分證字號格式或檢查碼錯誤"),
    UNDER_AGE("申請人須年滿 20 歲"),
    OUT_OF_SERVICE_HOURS("線上申請開放時段為每日 09:00–18:00"),
    OUT_OF_APPLICATION_PERIOD("此補助類別目前不在本月受理期間"),
    ALREADY_APPLIED_THIS_MONTH("本月已受理過此補助類別的申請"),
    ELIGIBLE("符合受理資格");

    private final String message;

    ReasonCode(String message) {
        this.message = message;
    }

    public String message() {
        return message;
    }
}
