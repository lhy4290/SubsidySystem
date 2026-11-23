package com.example.subsidy;

import com.example.subsidy.domain.ReasonCode;
import com.example.subsidy.dto.EligibilityRequest;
import com.example.subsidy.dto.EligibilityResponse;
import com.example.subsidy.repository.InMemoryApplicationRepository;
import com.example.subsidy.service.EligibilityService;
import com.example.subsidy.util.NationalIdHasher;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.*;

import static com.example.subsidy.domain.ReasonCode.*;
import static org.junit.jupiter.api.Assertions.*;

class EligibilityServiceTest {

    private static final ZoneId TAIPEI = ZoneId.of("Asia/Taipei");
    private static final String ADULT = "1990-01-01";
    private static final String ID = "A123456789";

    private final InMemoryApplicationRepository repo = new InMemoryApplicationRepository();
    private final NationalIdHasher hasher = new NationalIdHasher("test-salt");

    /** 建立時鐘固定於指定台北時間之服務；同一測試共用 repo */
    private EligibilityService at(String taipeiDateTime) {
        Instant instant = LocalDateTime.parse(taipeiDateTime).atZone(TAIPEI).toInstant();
        return new EligibilityService(Clock.fixed(instant, TAIPEI), repo, hasher);
    }

    private static EligibilityRequest req(String type, String birth, String id) {
        return new EligibilityRequest(type, birth, id);
    }

    private static void assertResult(ReasonCode expected, EligibilityResponse res) {
        assertEquals(expected, res.reasonCode());
        assertEquals(expected == ELIGIBLE, res.eligible());
    }

    @Nested
    @DisplayName("每個 reasonCode 至少一個案例")
    class EachReasonCode {
        @Test void eligible() {
            assertResult(ELIGIBLE, at("2026-11-05T10:00").check(req("RENT", ADULT, ID)));
        }
        @Test void invalidSubsidyType() {
            assertResult(INVALID_SUBSIDY_TYPE, at("2026-11-05T10:00").check(req("LONGCARE", ADULT, ID)));
        }
        @Test void invalidBirthDate() {
            assertResult(INVALID_BIRTH_DATE, at("2026-11-05T10:00").check(req("RENT", "1998/05/20", ID)));
        }
        @Test void invalidNationalId() {
            assertResult(INVALID_NATIONAL_ID, at("2026-11-05T10:00").check(req("RENT", ADULT, "A123456788")));
        }
        @Test void underAge() {
            assertResult(UNDER_AGE, at("2026-11-05T10:00").check(req("RENT", "2010-01-01", ID)));
        }
        @Test void outOfServiceHours() {
            assertResult(OUT_OF_SERVICE_HOURS, at("2026-11-05T20:00").check(req("RENT", ADULT, ID)));
        }
        @Test void outOfApplicationPeriod() {
            assertResult(OUT_OF_APPLICATION_PERIOD, at("2026-11-16T10:00").check(req("RENT", ADULT, ID)));
        }
        @Test void alreadyApplied() {
            EligibilityService s = at("2026-11-05T10:00");
            assertResult(ELIGIBLE, s.apply(req("RENT", ADULT, ID)));
            assertResult(ALREADY_APPLIED_THIS_MONTH, s.apply(req("RENT", ADULT, ID)));
        }
    }

    @ParameterizedTest(name = "{0} → {1}")
    @DisplayName("開放時段邊界：09:00:00 ≤ t < 18:00:00")
    @CsvSource({
            "2026-11-05T08:59:59, OUT_OF_SERVICE_HOURS",
            "2026-11-05T09:00:00, ELIGIBLE",
            "2026-11-05T17:59:59, ELIGIBLE",
            "2026-11-05T18:00:00, OUT_OF_SERVICE_HOURS"})
    void serviceHours(String time, ReasonCode expected) {
        assertResult(expected, at(time).check(req("RENT", ADULT, ID)));
    }

    @ParameterizedTest(name = "{0} {1}日 → {2}")
    @DisplayName("受理日期邊界（兩端包含）")
    @CsvSource({
            "RENT, 10, ELIGIBLE",
            "RENT, 11, OUT_OF_APPLICATION_PERIOD",
            "APPLIANCE, 1, OUT_OF_APPLICATION_PERIOD",
            "APPLIANCE, 2, ELIGIBLE",
            "SPORTS, 14, OUT_OF_APPLICATION_PERIOD",
            "SPORTS, 15, ELIGIBLE",
            "SPORTS, 25, ELIGIBLE",
            "SPORTS, 26, OUT_OF_APPLICATION_PERIOD"})
    void applicationPeriod(String type, int day, ReasonCode expected) {
        String time = String.format("2026-11-%02dT10:00", day);
        assertResult(expected, at(time).check(req(type, ADULT, ID)));
    }

    @Nested
    @DisplayName("年齡")
    class Age {
        @Test void exactly20Today() {
            assertResult(ELIGIBLE, at("2026-11-05T10:00").check(req("RENT", "2006-11-05", ID)));
        }
        @Test void oneDayShortOf20() {
            assertResult(UNDER_AGE, at("2026-11-05T10:00").check(req("RENT", "2006-11-06", ID)));
        }
        /** 2/29 出生且 20 歲生日落於平年：1900–2100 年間僅 2080 → 2100 */
        @Test void bornFeb29_nonLeapYear_feb28IsNotYet20() {
            assertResult(UNDER_AGE, at("2100-02-28T10:00").check(req("RENT", "2080-02-29", ID)));
        }
        @Test void bornFeb29_nonLeapYear_mar1Is20() {
            assertResult(ELIGIBLE, at("2100-03-01T10:00").check(req("RENT", "2080-02-29", ID)));
        }
    }

    @Nested
    @DisplayName("生日格式")
    class BirthDate {
        @ParameterizedTest
        @ValueSource(strings = {"2023-02-29", "2023-04-31", "1998/05/20", "1998-5-20", "2026-11-06"})
        void invalid(String birth) {
            assertResult(INVALID_BIRTH_DATE, at("2026-11-05T10:00").check(req("RENT", birth, ID)));
        }
        /** 2024-02-29 為有效日期，通過格式檢查，結果為 UNDER_AGE */
        @Test void leapDayPassesFormat() {
            assertResult(UNDER_AGE, at("2026-11-05T10:00").check(req("RENT", "2024-02-29", ID)));
        }
    }

    @Nested
    @DisplayName("null 與空白欄位回傳對應 INVALID_*")
    class NullAndBlank {
        @ParameterizedTest @NullAndEmptySource @ValueSource(strings = "   ")
        void subsidyType(String v) {
            assertResult(INVALID_SUBSIDY_TYPE, at("2026-11-05T10:00").check(req(v, ADULT, ID)));
        }
        @ParameterizedTest @NullAndEmptySource @ValueSource(strings = "   ")
        void birthDate(String v) {
            assertResult(INVALID_BIRTH_DATE, at("2026-11-05T10:00").check(req("RENT", v, ID)));
        }
        @ParameterizedTest @NullAndEmptySource @ValueSource(strings = "   ")
        void nationalId(String v) {
            assertResult(INVALID_NATIONAL_ID, at("2026-11-05T10:00").check(req("RENT", ADULT, v)));
        }
    }

    @Test
    @DisplayName("類別代碼不分大小寫")
    void lowercaseSubsidyType() {
        assertResult(ELIGIBLE, at("2026-11-05T10:00").check(req(" rent ", ADULT, ID)));
    }

    @Nested
    @DisplayName("重複申請")
    class Duplicate {
        @Test void eligibilityIsReadOnly() {
            EligibilityService s = at("2026-11-05T10:00");
            assertResult(ELIGIBLE, s.check(req("RENT", ADULT, ID)));
            assertResult(ELIGIBLE, s.check(req("RENT", ADULT, ID)));
        }
        @Test void eligibilitySeesExistingApplication() {
            EligibilityService s = at("2026-11-05T10:00");
            s.apply(req("RENT", ADULT, ID));
            assertResult(ALREADY_APPLIED_THIS_MONTH, s.check(req("RENT", ADULT, ID)));
        }
        @Test void sameTypeDifferentMonthAllowed() {
            assertResult(ELIGIBLE, at("2026-11-05T10:00").apply(req("RENT", ADULT, ID)));
            assertResult(ELIGIBLE, at("2026-12-05T10:00").apply(req("RENT", ADULT, ID)));
        }
        @Test void sameMonthDifferentTypeAllowed() {
            EligibilityService s = at("2026-11-03T10:00");
            assertResult(ELIGIBLE, s.apply(req("RENT", ADULT, ID)));
            assertResult(ELIGIBLE, s.apply(req("TRAVEL", ADULT, ID)));
        }
        /** 雜湊以正規化值計算，大小寫與前後空白不影響判定 */
        @Test void normalizedIdCannotBypass() {
            EligibilityService s = at("2026-11-05T10:00");
            assertResult(ELIGIBLE, s.apply(req("RENT", ADULT, "a123456789")));
            assertResult(ALREADY_APPLIED_THIS_MONTH, s.apply(req("RENT", ADULT, "A123456789　")));
        }
    }

    @Test
    @DisplayName("UTC 時區 Clock：01:00Z（台北 09:00）受理")
    void utcClockIsConvertedToTaipei() {
        Clock utc = Clock.fixed(Instant.parse("2026-11-05T01:00:00Z"), ZoneOffset.UTC);
        EligibilityResponse res = new EligibilityService(utc, repo, hasher).check(req("RENT", ADULT, ID));
        assertResult(ELIGIBLE, res);
        assertEquals(ZoneOffset.ofHours(8), res.checkedAt().getOffset());
    }

    @ParameterizedTest(name = "{0} {1} → {2}")
    @DisplayName("nextAvailableAt：同時符合開放時段與受理日期的最早時間點")
    @CsvSource({
            "SPORTS, 2026-11-16T08:00, 2026-11-16T09:00",   // 開放日 09:00 前 → 當日
            "SPORTS, 2026-11-16T19:00, 2026-11-17T09:00",   // 開放日 18:00 後，次日仍在期間 → 次日
            "RENT,   2026-11-16T19:02, 2026-12-01T09:00",   // 時段外且次日不在期間 → 次月 1 日
            "RENT,   2026-11-16T10:00, 2026-12-01T09:00"})  // 受理期間外 → 次月 1 日
    void nextAvailableAt(String type, String now, String expected) {
        EligibilityResponse res = at(now).check(req(type, ADULT, ID));
        assertFalse(res.eligible());
        assertEquals(LocalDateTime.parse(expected).atZone(TAIPEI).toOffsetDateTime(), res.nextAvailableAt());
    }

    @ParameterizedTest(name = "{0} 本月已受理 → {2}")
    @DisplayName("本月已受理：nextAvailableAt 為下個月第一個受理日 09:00")
    @CsvSource({
            "RENT,   2026-11-05T10:00, 2026-12-01T09:00",
            "SPORTS, 2026-11-17T10:00, 2026-12-15T09:00",
            "RENT,   2026-12-05T10:00, 2027-01-01T09:00"})   // 跨年
    void nextAvailableAtWhenAlreadyApplied(String type, String now, String expected) {
        EligibilityService s = at(now);
        s.apply(req(type, ADULT, ID));
        EligibilityResponse res = s.apply(req(type, ADULT, ID));
        assertResult(ALREADY_APPLIED_THIS_MONTH, res);
        assertEquals(LocalDateTime.parse(expected).atZone(TAIPEI).toOffsetDateTime(), res.nextAvailableAt());
    }

    @Test
    @DisplayName("非時間類原因不提供 nextAvailableAt")
    void noNextAvailableForOtherReasons() {
        assertNull(at("2026-11-05T10:00").check(req("RENT", "2010-01-01", ID)).nextAvailableAt());
    }
}
