package com.codeforge.gateway.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class JwtProperties {

    private Jwt jwt = new Jwt();
    private List<String> publicPaths = new ArrayList<>();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
    }
}
