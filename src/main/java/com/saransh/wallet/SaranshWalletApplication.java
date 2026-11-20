package com.saransh.wallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SaranshWalletApplication {

    public static void main(String[] args) {
        SpringApplication.run(SaranshWalletApplication.class, args);
    }
}
