package com.example.subsidy.service;

import com.example.subsidy.domain.ReasonCode;
import com.example.subsidy.domain.SubsidyType;
import com.example.subsidy.dto.EligibilityRequest;
import com.example.subsidy.dto.EligibilityResponse;
import com.example.subsidy.repository.ApplicationRepository;
import com.example.subsidy.repository.ApplicationRepository.ApplicationKey;
import com.example.subsidy.util.NationalIdHasher;
import com.example.subsidy.util.PiiMasker;
import com.example.subsidy.validation.NationalIdValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.Optional;

import static com.example.subsidy.SubsidyApplication.TAIPEI;
import static com.example.subsidy.domain.ReasonCode.*;

@Service
public class EligibilityService {

    private static final Logger log = LoggerFactory.getLogger(EligibilityService.class);

    static final int MIN_AGE = 20;
    /** 開放時段 [09:00, 18:00)，18:00:00 不受理 */
    static final LocalTime OPEN = LocalTime.of(9, 0);
    static final LocalTime CLOSE = LocalTime.of(18, 0);

    private final Clock clock;
    private final ApplicationRepository repository;
    private final NationalIdHasher hasher;

    public EligibilityService(Clock clock, ApplicationRepository repository, NationalIdHasher hasher) {
        this.clock = clock;
        this.repository = repository;
        this.hasher = hasher;
    }

    /** 資格查詢，唯讀 */
    public EligibilityResponse check(EligibilityRequest req) {
        return logged("check", req, evaluate(req, false));
    }

    /** 送件：檢查通過後原子寫入受理紀錄 */
    public EligibilityResponse apply(EligibilityRequest req) {
        return logged("apply", req, evaluate(req, true));
    }

    private EligibilityResponse evaluate(EligibilityRequest req, boolean record) {
        // 單次取時，所有檢查共用；統一轉換為 Asia/Taipei，不依賴 Clock 時區
        ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(TAIPEI);
        LocalDate today = now.toLocalDate();

        Optional<SubsidyType> type = SubsidyType.parse(req.subsidyType());
        if (type.isEmpty()) return result(INVALID_SUBSIDY_TYPE, now, null);

        Optional<LocalDate> birthDate = parseBirthDate(req.birthDate(), today);
        if (birthDate.isEmpty()) return result(INVALID_BIRTH_DATE, now, null);

        String nationalId = NationalIdValidator.normalize(req.nationalId());
        if (!NationalIdValidator.isValid(nationalId)) return result(INVALID_NATIONAL_ID, now, null);

        // Period 計算至日：生日當日滿歲；2/29 出生者於平年以 3/1 起算
        if (Period.between(birthDate.get(), today).getYears() < MIN_AGE) return result(UNDER_AGE, now, null);

        LocalTime time = now.toLocalTime();
        if (time.isBefore(OPEN) || !time.isBefore(CLOSE))
            return result(OUT_OF_SERVICE_HOURS, now, nextAvailableAt(type.get(), now));

        if (!type.get().isOpenOn(today.getDayOfMonth()))
            return result(OUT_OF_APPLICATION_PERIOD, now, nextAvailableAt(type.get(), now));

        ApplicationKey key = new ApplicationKey(hasher.hash(nationalId), type.get(), YearMonth.from(today));
        boolean duplicated = record ? !repository.tryRecord(key) : repository.exists(key);
        if (duplicated) return result(ALREADY_APPLIED_THIS_MONTH, now, firstOpenOfNextMonth(type.get(), today));

        return result(ELIGIBLE, now, null);
    }

    /** 解析 yyyy-MM-dd；不存在之日期（如 2023-02-29）與未來日期回傳 empty */
    private static Optional<LocalDate> parseBirthDate(String raw, LocalDate today) {
        if (raw == null) return Optional.empty();
        try {
            LocalDate date = LocalDate.parse(raw.strip());
            return date.isAfter(today) ? Optional.empty() : Optional.of(date);
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    /** 同時符合開放時段與受理日之最早時點 */
    static ZonedDateTime nextAvailableAt(SubsidyType type, ZonedDateTime now) {
        LocalDate date = now.toLocalTime().isBefore(OPEN) ? now.toLocalDate() : now.toLocalDate().plusDays(1);
        while (!type.isOpenOn(date.getDayOfMonth())) {
            date = date.plusDays(1);
        }
        return date.atTime(OPEN).atZone(TAIPEI);
    }

    /** 次月第一個受理日 09:00 */
    static ZonedDateTime firstOpenOfNextMonth(SubsidyType type, LocalDate today) {
        return nextAvailableAt(type, today.withDayOfMonth(1).plusMonths(1).atStartOfDay(TAIPEI));
    }

    private static EligibilityResponse result(ReasonCode code, ZonedDateTime now, ZonedDateTime next) {
        return EligibilityResponse.of(code, now, next);
    }

    /** log 僅記錄遮罩後身分證字號，不記錄生日 */
    private static EligibilityResponse logged(String action, EligibilityRequest req, EligibilityResponse res) {
        log.info("{} type={} id={} result={}", action, req.subsidyType(),
                PiiMasker.maskNationalId(req.nationalId()), res.reasonCode());
        return res;
    }
}
