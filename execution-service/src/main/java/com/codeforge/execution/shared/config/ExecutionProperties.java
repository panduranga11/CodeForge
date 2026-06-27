package com.codeforge.execution.shared.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "app.execution")
@Getter
@Setter
public class ExecutionProperties {

    private int compilationTimeoutSeconds = 30;

    private int maxSourceCodeBytes = 65536;

    private int rateLimit = 10;
    private int rateLimitWindowMinutes = 10;

    private Map<String, LanguageLimits> languages = Map.of(
            "JAVA", new LanguageLimits(2.0, 1.0),
            "PYTHON", new LanguageLimits(3.0, 1.0),
            "CPP", new LanguageLimits(1.0, 1.0),
            "JAVASCRIPT", new LanguageLimits(2.5, 1.0)
    );

    @Getter
    @Setter
    public static class LanguageLimits {
        private double timeMultiplier;
        private double memoryMultiplier;

        public LanguageLimits() {}

        public LanguageLimits(double timeMultiplier, double memoryMultiplier) {
            this.timeMultiplier = timeMultiplier;
            this.memoryMultiplier = memoryMultiplier;
        }
    }
}
