package com.example.subsidy.domain;

import java.util.Locale;
import java.util.Optional;

/**
 * 補助類別與每月受理日區間（含起訖日）。
 * 受理日以資料定義，規則調整集中於此；後續可改由設定檔或 DB 載入。
 */
public enum SubsidyType {
    RENT("租金補貼", 1, 10),
    APPLIANCE("家電補助", 2, 5),
    TRAVEL("旅遊補助", 1, 5),
    SPORTS("運動補助", 15, 25);

    private final String displayName;
    private final int openDay;
    private final int closeDay;

    SubsidyType(String displayName, int openDay, int closeDay) {
        this.displayName = displayName;
        this.openDay = openDay;
        this.closeDay = closeDay;
    }

    public String displayName() {
        return displayName;
    }

    public boolean isOpenOn(int dayOfMonth) {
        return dayOfMonth >= openDay && dayOfMonth <= closeDay;
    }

    /** strip 後轉大寫比對代碼；null、空白或未知代碼回傳 empty */
    public static Optional<SubsidyType> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String code = raw.strip().toUpperCase(Locale.ROOT);
        for (SubsidyType type : values()) {
            if (type.name().equals(code)) {
                return Optional.of(type);
            }
        }
        return Optional.empty();
    }
}
