package com.example.subsidy.repository;

import org.springframework.stereotype.Repository;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** 記憶體實作，供開發與測試使用。正式環境改用 DB 唯一鍵約束 */
@Repository
public class InMemoryApplicationRepository implements ApplicationRepository {

    private final Set<ApplicationKey> records = ConcurrentHashMap.newKeySet();

    @Override
    public boolean exists(ApplicationKey key) {
        return records.contains(key);
    }

    /** ConcurrentHashMap.newKeySet().add 為原子操作，對應 DB 之 INSERT 與唯一鍵約束 */
    @Override
    public boolean tryRecord(ApplicationKey key) {
        return records.add(key);
    }
}
