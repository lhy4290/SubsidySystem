package com.example.subsidy.dto;

/**
 * 資格驗證請求。
 * 欄位一律為 String，格式驗證於 Service 進行。若宣告為 enum 或 LocalDate，
 * 格式錯誤會於反序列化階段回 400，無法回傳 INVALID_SUBSIDY_TYPE / INVALID_BIRTH_DATE。
 */
public record EligibilityRequest(String subsidyType, String birthDate, String nationalId) {
}
