package com.example.subsidy.dto;

import com.example.subsidy.domain.ReasonCode;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

/**
 * 驗證結果。eligible 為題目要求之 Boolean 回傳值。
 * nextAvailableAt 僅於時段外、受理期間外、本月已受理時提供。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EligibilityResponse(
        boolean eligible,
        ReasonCode reasonCode,
        String message,
        OffsetDateTime checkedAt,
        OffsetDateTime nextAvailableAt) {

    public static EligibilityResponse of(ReasonCode code, ZonedDateTime checkedAt, ZonedDateTime nextAvailableAt) {
        return new EligibilityResponse(
                code == ReasonCode.ELIGIBLE,   // eligible：7 項檢查全數通過為 true
                code,
                code.message(),
                checkedAt.truncatedTo(ChronoUnit.SECONDS).toOffsetDateTime(),
                nextAvailableAt == null ? null : nextAvailableAt.toOffsetDateTime());
    }
}
