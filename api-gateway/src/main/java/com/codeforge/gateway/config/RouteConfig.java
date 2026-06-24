package com.codeforge.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RouteConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("auth-service", r -> r
                        .path("/auth/**")
                        .uri("lb://AUTH-SERVICE"))
                .route("contest-service", r -> r
                        .path("/contest/v1/**")
                        .uri("lb://CONTEST-SERVICE"))
                .route("execution-service", r -> r
                        .path("/exec/v1/**")
                        .uri("lb://EXECUTION-SERVICE"))
                .route("ai-service", r -> r
                        .path("/ai/**")
                        .uri("lb://AI-SERVICE"))
                .build();
    }
}
