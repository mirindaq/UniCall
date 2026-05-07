package iuh.fit.identity_service.config;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.identity_service.clients.GrpcUserServiceClient;
import iuh.fit.identity_service.clients.KeycloakIdentityClient;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapInitializer implements ApplicationRunner {
    private static final int PROFILE_SYNC_MAX_ATTEMPTS = 10;
    private static final long PROFILE_SYNC_RETRY_DELAY_MS = 1500L;

    private final KeycloakIdentityClient keycloakIdentityClient;
    private final GrpcUserServiceClient grpcUserServiceClient;

    @Value("${app.bootstrap.admin.enabled:true}")
    private boolean adminBootstrapEnabled;

    @Value("${app.bootstrap.admin.phone-number:0900000000}")
    private String adminPhoneNumber;

    @Value("${app.bootstrap.admin.email:admin@unicall.local}")
    private String adminEmail;

    @Value("${app.bootstrap.admin.first-name:System}")
    private String adminFirstName;

    @Value("${app.bootstrap.admin.last-name:Admin}")
    private String adminLastName;

    @Value("${app.bootstrap.admin.password:Admin@123}")
    private String adminPassword;

    @Value("${app.bootstrap.admin.role:admin}")
    private String adminRole;

    @Override
    public void run(ApplicationArguments args) {
        if (!adminBootstrapEnabled) {
            return;
        }

        String identityUserId = keycloakIdentityClient.createOrGetUser(
                adminPhoneNumber,
                adminEmail,
                adminFirstName,
                adminLastName,
                adminPassword
        );
        keycloakIdentityClient.ensureRealmRoleExists(adminRole);
        keycloakIdentityClient.assignRealmRoleIfMissing(identityUserId, adminRole);

        RegisterRequest registerRequest = RegisterRequest.builder()
                .phoneNumber(adminPhoneNumber)
                .email(adminEmail)
                .firstName(adminFirstName)
                .lastName(adminLastName)
                .gender("OTHER")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .password(adminPassword)
                .firebaseIdToken("bootstrap")
                .build();

        ensureAdminUserProfile(identityUserId, registerRequest);
        log.info("Admin bootstrap is ready for phone {}", adminPhoneNumber);
    }

    private void ensureAdminUserProfile(String identityUserId, RegisterRequest registerRequest) {
        for (int attempt = 1; attempt <= PROFILE_SYNC_MAX_ATTEMPTS; attempt++) {
            try {
                if (grpcUserServiceClient.userProfileExists(identityUserId)) {
                    return;
                }

                grpcUserServiceClient.register(registerRequest, identityUserId);
                log.info("Admin profile created for identityUserId {}", identityUserId);
                return;
            } catch (ConflictException ex) {
                if (grpcUserServiceClient.userProfileExists(identityUserId)) {
                    return;
                }
                throw new IllegalStateException("Admin bootstrap detected conflicting user profile data", ex);
            } catch (RuntimeException ex) {
                if (attempt == PROFILE_SYNC_MAX_ATTEMPTS) {
                    throw new IllegalStateException("Admin bootstrap failed to create admin user profile", ex);
                }

                log.warn(
                        "Admin bootstrap could not create profile on attempt {}/{}. Retrying...",
                        attempt,
                        PROFILE_SYNC_MAX_ATTEMPTS
                );
                sleepBeforeRetry();
            }
        }
    }

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(PROFILE_SYNC_RETRY_DELAY_MS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Admin bootstrap was interrupted while waiting to retry", ex);
        }
    }
}
