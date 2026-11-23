package com.example.subsidy;

import com.example.subsidy.validation.NationalIdValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class NationalIdValidatorTest {

    private static boolean valid(String raw) {
        return NationalIdValidator.isValid(NationalIdValidator.normalize(raw));
    }

    @Test void validId() { assertTrue(valid("A123456789")); }
    @Test void wrongChecksum() { assertFalse(valid("A123456788")); }
    @Test void lowercase() { assertTrue(valid("a123456789")); }
    @Test void surroundingSpaces() { assertTrue(valid("  A123456789  ")); }
    @Test void fullWidthSpace() { assertTrue(valid("A123456789　")); }
    @Test void trailingNewline() { assertTrue(valid("A123456789\n")); }
    @Test void secondDigit3() { assertFalse(valid("A323456789")); }
    @Test void nullInput() { assertFalse(valid(null)); }

    @ParameterizedTest
    @ValueSource(strings = {"A12345678", "A1234567890", "", "1123456789", "AA23456789"})
    void wrongFormat(String id) { assertFalse(valid(id)); }

    /** 每個首碼字母皆可產生合法字號（第二碼 1，末碼為檢查碼） */
    @Test
    void everyLetterHasAValidId() {
        for (char c = 'A'; c <= 'Z'; c++) {
            boolean found = false;
            for (int d = 0; d <= 9 && !found; d++) {
                found = valid(c + "12345678" + d);
            }
            assertTrue(found, "字母 " + c + " 找不到合法檢查碼");
        }
    }
}
