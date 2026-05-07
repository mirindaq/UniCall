package iuh.fit.identity_service.services;

public interface FirebasePhoneVerificationService {
    void verifyPhoneIdToken(String firebaseIdToken, String expectedPhoneNumber);
}
