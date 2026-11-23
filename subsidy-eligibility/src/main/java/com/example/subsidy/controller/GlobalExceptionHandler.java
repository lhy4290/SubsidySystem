package com.example.subsidy.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * JSON 格式錯誤統一回 400。
 * Jackson 例外訊息含原始輸入（身分證字號、生日），回應與 log 均不使用 e.getMessage()。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleUnreadable(HttpMessageNotReadableException e) {
        log.warn("JSON 格式錯誤，請求已拒絕");
        return Map.of("error", "INVALID_JSON", "message", "請求格式錯誤，請確認為有效的 JSON");
    }
}
