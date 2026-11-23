package com.example.subsidy;

import com.example.subsidy.domain.SubsidyType;
import com.example.subsidy.repository.ApplicationRepository.ApplicationKey;
import com.example.subsidy.repository.InMemoryApplicationRepository;
import com.example.subsidy.util.PiiMasker;
import org.junit.jupiter.api.Test;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/** PiiMasker 與 Repository 併發寫入 */
class SupportTest {

    @Test
    void maskValidId() {
        assertEquals("A12****789", PiiMasker.maskNationalId("A123456789"));
    }

    @Test
    void maskNeverThrows() {
        assertDoesNotThrow(() -> {
            assertEquals("(null)", PiiMasker.maskNationalId(null));
            assertEquals("(invalid-length)", PiiMasker.maskNationalId(""));
            assertEquals("(invalid-length)", PiiMasker.maskNationalId("A12"));
        });
    }

    /** 多執行緒同時對同一鍵 tryRecord，僅一筆成功 */
    @Test
    void tryRecordIsAtomic() throws Exception {
        int threads = 32;
        for (int round = 0; round < 200; round++) {
            InMemoryApplicationRepository repo = new InMemoryApplicationRepository();
            ApplicationKey key = new ApplicationKey("hash", SubsidyType.RENT, YearMonth.of(2026, 11));
            CountDownLatch start = new CountDownLatch(1);
            AtomicInteger success = new AtomicInteger();
            ExecutorService pool = Executors.newFixedThreadPool(threads);
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    if (repo.tryRecord(key)) success.incrementAndGet();
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> f : futures) f.get();
            pool.shutdown();
            assertEquals(1, success.get(), "第 " + round + " 輪");
        }
    }
}
