package com.saransh.wallet.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI walletOpenApi() {
        return new OpenAPI().info(new Info()
            .title("Saransh Wallet & Payment Ledger Platform API")
            .description("High-performance distributed payment processing and real-time double-entry ledger engine. "
                + "Submissions are validated and durably queued via a transactional outbox pattern, "
                + "then settled asynchronously through Apache Kafka with idempotent, order-preserving consumers "
                + "and deterministic deadlock-free lock ordering.")
            .version("v1.0.0")
            .contact(new Contact()
                .name("Saransh Singh")
                .url("https://github.com/Saransh2005/wallet"))
            .license(new License().name("MIT").url("https://opensource.org/licenses/MIT")));
    }
}
