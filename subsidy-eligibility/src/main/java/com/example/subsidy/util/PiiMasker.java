package com.example.subsidy.util;

/** log 用個資遮罩，須接受任意輸入（含不合法值） */
public final class PiiMasker {

    private PiiMasker() {
    }

    /** A123456789 → A12****789；null 或長度不為 10 時回傳固定字串 */
    public static String maskNationalId(String id) {
        if (id == null) {
            return "(null)";
        }
        String s = id.strip();
        if (s.length() != 10) {
            return "(invalid-length)";
        }
        return s.substring(0, 3) + "****" + s.substring(7);
    }
}
