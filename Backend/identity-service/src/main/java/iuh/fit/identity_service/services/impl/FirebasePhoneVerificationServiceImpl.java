package iuh.fit.identity_service.services.impl;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.identity_service.services.FirebasePhoneVerificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FirebasePhoneVerificationServiceImpl implements FirebasePhoneVerificationService {
    @Value("${app.firebase.enabled:false}")
    private boolean firebaseEnabled;

    @Override
    public void verifyPhoneIdToken(String firebaseIdToken, String expectedPhoneNumber) {
        if (!firebaseEnabled) {
            throw new InvalidParamException("Firebase OTP is not enabled on server");
        }
        if (firebaseIdToken == null || firebaseIdToken.isBlank()) {
            throw new InvalidParamException("Firebase OTP token is required");
        }
        if (expectedPhoneNumber == null || expectedPhoneNumber.isBlank()) {
            throw new InvalidParamException("Expected phone number is required");
        }

        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(firebaseIdToken);
            Object tokenPhone = decodedToken.getClaims().get("phone_number");
            if (!(tokenPhone instanceof String phoneNumberFromToken) || phoneNumberFromToken.isBlank()) {
                throw new UnauthenticatedException("Firebase token does not contain verified phone number");
            }

            String normalizedTokenPhone = normalizeVietnamPhone(phoneNumberFromToken);
            String normalizedExpectedPhone = normalizeVietnamPhone(expectedPhoneNumber);

            if (!normalizedTokenPhone.equals(normalizedExpectedPhone)) {
                throw new UnauthenticatedException("Phone number verified by OTP does not match request");
            }
        } catch (FirebaseAuthException exception) {
            throw new UnauthenticatedException("Invalid or expired Firebase OTP token");
        }
    }

    private String normalizeVietnamPhone(String rawPhone) {
        String digits = rawPhone == null ? "" : rawPhone.replaceAll("\\D", "");
        if (digits.startsWith("84") && digits.length() == 11) {
            return "0" + digits.substring(2);
        }
        if (digits.startsWith("0") && digits.length() == 10) {
            return digits;
        }
        return digits;
    }
}
