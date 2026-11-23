package com.example.subsidy.controller;

import com.example.subsidy.dto.EligibilityRequest;
import com.example.subsidy.dto.EligibilityResponse;
import com.example.subsidy.service.EligibilityService;
import org.springframework.web.bind.annotation.*;

/**
 * 採 POST：身分證字號不得出現於 URL，以免寫入 access log。
 * 業務判定結果一律回 200 並附 reasonCode；僅 JSON 格式錯誤回 400。
 */
@RestController
@RequestMapping("/api/v1/subsidies")
public class EligibilityController {

    private final EligibilityService service;

    public EligibilityController(EligibilityService service) {
        this.service = service;
    }

    /** 資格查詢，唯讀 */
    @PostMapping("/eligibility")
    public EligibilityResponse checkEligibility(@RequestBody EligibilityRequest request) {
        return service.check(request);
    }

    /** 送件：檢查通過後寫入受理紀錄 */
    @PostMapping("/applications")
    public EligibilityResponse submitApplication(@RequestBody EligibilityRequest request) {
        return service.apply(request);
    }
}
