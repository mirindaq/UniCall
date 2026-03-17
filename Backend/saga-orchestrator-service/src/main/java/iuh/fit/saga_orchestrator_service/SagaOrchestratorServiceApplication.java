package iuh.fit.saga_orchestrator_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "iuh.fit")
public class SagaOrchestratorServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SagaOrchestratorServiceApplication.class, args);
    }
}
