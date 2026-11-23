package com.example.subsidy.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * 身分證字號雜湊：SHA-256(salt + 正規化身分證字號)，資料庫僅存雜湊值。
 * 正式環境改用 HMAC，金鑰置於 KMS；見 README「正式環境考量」。
 */
@Component
public class NationalIdHasher {

    private final byte[] salt;

    public NationalIdHasher(@Value("${subsidy.national-id-salt}") String salt) {
        this.salt = salt.getBytes(StandardCharsets.UTF_8);
    }

    public String hash(String normalizedId) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt);
            return HexFormat.of().formatHex(md.digest(normalizedId.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("JVM 不支援 SHA-256", e);
        }
    }
}
