package com.example.subsidy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** HTTP 層：業務判定回 200；JSON 格式錯誤回 400，回應與 log 不含原始輸入 */
@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class EligibilityControllerTest {

    @Autowired
    MockMvc mvc;

    @Test
    void businessRejectionReturns200() throws Exception {
        mvc.perform(post("/api/v1/subsidies/eligibility").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subsidyType\":\"LONGCARE\",\"birthDate\":\"1998-05-20\",\"nationalId\":\"A123456789\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.reasonCode").value("INVALID_SUBSIDY_TYPE"));
    }

    @Test
    void invalidDateStringReturns200NotJackson400() throws Exception {
        mvc.perform(post("/api/v1/subsidies/eligibility").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subsidyType\":\"RENT\",\"birthDate\":\"2023-02-29\",\"nationalId\":\"A123456789\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reasonCode").value("INVALID_BIRTH_DATE"));
    }

    @Test
    void brokenJsonReturns400WithoutLeakingPii(CapturedOutput output) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/subsidies/eligibility").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subsidyType\":\"RENT\",\"birthDate\":\"1998-05-20\",\"nationalId\":A123456789}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_JSON"))
                .andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("A123456789");
        assertThat(output.getAll()).doesNotContain("A123456789").doesNotContain("1998-05-20");
    }
}
