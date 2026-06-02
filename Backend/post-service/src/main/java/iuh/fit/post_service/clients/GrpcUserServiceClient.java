package iuh.fit.post_service.clients;

import iuh.fit.unicall.grpc.user.v1.GetUserProfileByIdentityRequest;
import iuh.fit.unicall.grpc.user.v1.GetUserProfileByIdentityResponse;
import iuh.fit.unicall.grpc.user.v1.UserServiceGrpc;
import io.grpc.StatusRuntimeException;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
public class GrpcUserServiceClient {
  @GrpcClient("user-service")
  private UserServiceGrpc.UserServiceBlockingStub userStub;

  private final long deadlineMs;

  public GrpcUserServiceClient(@Value("${grpc.user-service.deadline-ms:5000}") long deadlineMs) {
    this.deadlineMs = deadlineMs;
  }

  public Optional<UserProfileResult> getUserProfile(String identityUserId) {
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
      return Optional.of(new UserProfileResult(
          response.getIdentityUserId(),
          response.getFirstName(),
          response.getLastName(),
          response.getEmail()
      ));
    } catch (StatusRuntimeException ex) {
      return Optional.empty();
    }
  }

  public record UserProfileResult(
      String identityUserId,
      String firstName,
      String lastName,
      String email
  ) {
    public String displayName() {
      String fullName = ((lastName == null ? "" : lastName.trim()) + " "
          + (firstName == null ? "" : firstName.trim())).trim();
      if (!fullName.isBlank()) {
        return fullName;
      }
      return email == null || email.isBlank() ? identityUserId : email;
    }
  }
}
