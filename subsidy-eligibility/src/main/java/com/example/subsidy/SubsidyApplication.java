package com.example.subsidy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.time.Clock;
import java.time.ZoneId;

@SpringBootApplication
public class SubsidyApplication {

    public static final ZoneId TAIPEI = ZoneId.of("Asia/Taipei");

    public static void main(String[] args) {
        SpringApplication.run(SubsidyApplication.class, args);
    }

    /** 系統時鐘（Asia/Taipei）；測試以 Clock.fixed 替換 */
    @Bean
    public Clock clock() {
        return Clock.system(TAIPEI);
    }
}
