package iuh.fit.identity_service.services;

public interface LoginSessionEventPublisher {
    void publishLoggedInElsewhere(String identityUserId);
}
