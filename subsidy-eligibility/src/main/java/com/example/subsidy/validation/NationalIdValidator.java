package com.example.subsidy.validation;

import java.util.Locale;
import java.util.regex.Pattern;

/** 中華民國身分證字號驗證：格式與檢查碼 */
public final class NationalIdValidator {

    private static final Pattern FORMAT = Pattern.compile("^[A-Z][12]\\d{8}$");

    /** 首碼字母對應之兩位數代碼，依 A–Z 排列；I、O、W–Z 非連續 */
    private static final int[] LETTER_CODES = {
            10, 11, 12, 13, 14, 15, 16, 17, 34, 18, 19, 20, 21,
            22, 35, 23, 24, 25, 26, 27, 28, 29, 32, 30, 31, 33};

    /** 字母代碼展開後共 11 位數之加權係數 */
    private static final int[] WEIGHTS = {1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1};

    private NationalIdValidator() {
    }

    /** 正規化：strip()（涵蓋 U+3000 全形空白）後轉大寫；雜湊與比對均使用此結果 */
    public static String normalize(String raw) {
        return raw == null ? null : raw.strip().toUpperCase(Locale.ROOT);
    }

    /** 參數須為正規化後的值。以 matches() 比對全字串，避免 find() 接受尾端換行 */
    public static boolean isValid(String id) {
        if (id == null || !FORMAT.matcher(id).matches()) {
            return false;
        }
        int letterCode = LETTER_CODES[id.charAt(0) - 'A'];
        int sum = (letterCode / 10) * WEIGHTS[0] + (letterCode % 10) * WEIGHTS[1];
        for (int i = 1; i < 10; i++) {
            sum += (id.charAt(i) - '0') * WEIGHTS[i + 1];
        }
        return sum % 10 == 0;
    }
}
