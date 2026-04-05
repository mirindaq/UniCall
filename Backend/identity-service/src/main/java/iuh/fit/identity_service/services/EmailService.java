package iuh.fit.identity_service.services;

public interface EmailService {
    void sendActivationEmailAsync(String identityUserId);

    void sendPasswordResetEmailAsync(String identityUserId);
}
