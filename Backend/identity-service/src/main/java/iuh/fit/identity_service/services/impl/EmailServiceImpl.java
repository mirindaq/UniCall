package iuh.fit.identity_service.services.impl;

import iuh.fit.identity_service.clients.KeycloakIdentityClient;
import iuh.fit.identity_service.services.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {
    private final KeycloakIdentityClient keycloakIdentityClient;

    @Override
    @Async("mailExecutor")
    public void sendActivationEmailAsync(String identityUserId) {
        try {
            keycloakIdentityClient.sendAccountActivationEmail(identityUserId);
        } catch (Exception ex) {
            log.error("Failed to send activation email for identity user id {}", identityUserId, ex);
        }
    }

    @Override
    @Async("mailExecutor")
    public void sendPasswordResetEmailAsync(String identityUserId) {
        try {
            keycloakIdentityClient.sendPasswordResetEmail(identityUserId);
        } catch (Exception ex) {
            log.error("Failed to send reset password email for identity user id {}", identityUserId, ex);
        }
    }
}
