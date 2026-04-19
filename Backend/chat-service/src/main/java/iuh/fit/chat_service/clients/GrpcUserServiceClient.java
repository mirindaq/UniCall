package iuh.fit.chat_service.clients;

import iuh.fit.unicall.grpc.user.v1.GetUserProfileByIdentityRequest;
import iuh.fit.unicall.grpc.user.v1.GetUserProfileByIdentityResponse;
import iuh.fit.unicall.grpc.user.v1.UserServiceGrpc;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class GrpcUserServiceClient {
    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userStub;

    private final long deadlineMs;

    public GrpcUserServiceClient(@Value("${grpc.user-service.deadline-ms:5000}") long deadlineMs) {
        this.deadlineMs = deadlineMs;
    }

    public Optional<UserDisplayInfo> getUserDisplayInfo(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            return Optional.empty();
        }

        GetUserProfileByIdentityRequest request = GetUserProfileByIdentityRequest.newBuilder()
                .setIdentityUserId(identityUserId)
                .build();

        try {
            GetUserProfileByIdentityResponse response = userStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .getUserProfileByIdentity(request);

            String displayName = (safe(response.getLastName()) + " " + safe(response.getFirstName())).trim();
            if (displayName.isBlank()) {
                displayName = safe(response.getPhoneNumber());
            }
            if (displayName.isBlank()) {
                displayName = identityUserId;
            }

            String avatar = safe(response.getAvatar());
            return Optional.of(new UserDisplayInfo(displayName, avatar.isBlank() ? null : avatar));
        } catch (StatusRuntimeException ex) {
            if (ex.getStatus().getCode() == Status.Code.NOT_FOUND) {
                return Optional.empty();
            }
            log.warn("Cannot fetch user profile via gRPC for identityUserId={}: {}", identityUserId, ex.getMessage());
            return Optional.empty();
        }
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    public record UserDisplayInfo(String displayName, String avatar) {
    }
}
