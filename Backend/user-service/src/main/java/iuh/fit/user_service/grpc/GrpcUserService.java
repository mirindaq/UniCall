package iuh.fit.user_service.grpc;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.unicall.grpc.user.v1.CreateUserProfileRequest;
import iuh.fit.unicall.grpc.user.v1.CreateUserProfileResponse;
import iuh.fit.unicall.grpc.user.v1.DeleteUserProfileRequest;
import iuh.fit.unicall.grpc.user.v1.DeleteUserProfileResponse;
import iuh.fit.unicall.grpc.user.v1.GetUserProfileByIdentityRequest;
import iuh.fit.unicall.grpc.user.v1.GetUserProfileByIdentityResponse;
import iuh.fit.unicall.grpc.user.v1.UserServiceGrpc;
import iuh.fit.user_service.entities.User;
import iuh.fit.user_service.services.UserProfileService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@Component
@RequiredArgsConstructor
public class GrpcUserService extends UserServiceGrpc.UserServiceImplBase {
    private final UserProfileService userProfileService;

    @Override
    public void createUserProfile(
            CreateUserProfileRequest request,
            StreamObserver<CreateUserProfileResponse> responseObserver
    ) {
        try {
            LocalDate dateOfBirth = LocalDate.parse(request.getDateOfBirth());
            Long id = userProfileService.createUserProfile(
                    request.getIdentityUserId(),
                    request.getPhoneNumber(),
                    request.getEmail(),
                    request.getFirstName(),
                    request.getLastName(),
                    request.getGender(),
                    dateOfBirth
            );

            responseObserver.onNext(CreateUserProfileResponse.newBuilder()
                    .setId(id)
                    .setIdentityUserId(request.getIdentityUserId())
                    .build());
            responseObserver.onCompleted();
        } catch (ConflictException ex) {
            responseObserver.onError(Status.ALREADY_EXISTS.withDescription(ex.getMessage()).asRuntimeException());
        } catch (DateTimeParseException ex) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Invalid dateOfBirth format").asRuntimeException());
        } catch (Exception ex) {
            responseObserver.onError(Status.INTERNAL.withDescription("Unable to create user profile").asRuntimeException());
        }
    }

    @Override
    public void deleteUserProfile(
            DeleteUserProfileRequest request,
            StreamObserver<DeleteUserProfileResponse> responseObserver
    ) {
        try {
            boolean deleted = userProfileService.deleteUserProfileByIdentityUserId(request.getIdentityUserId());
            responseObserver.onNext(DeleteUserProfileResponse.newBuilder().setDeleted(deleted).build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onError(Status.INTERNAL.withDescription("Unable to delete user profile").asRuntimeException());
        }
    }

    @Override
    public void getUserProfileByIdentity(
            GetUserProfileByIdentityRequest request,
            StreamObserver<GetUserProfileByIdentityResponse> responseObserver
    ) {
        try {
            String identityUserId = request.getIdentityUserId();
            if (identityUserId == null || identityUserId.isBlank()) {
                responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("identityUserId is required").asRuntimeException());
                return;
            }

            User user = userProfileService.getUserProfileByIdentityUserId(identityUserId);
            responseObserver.onNext(GetUserProfileByIdentityResponse.newBuilder()
                    .setId(user.getId())
                    .setIdentityUserId(user.getIdentityUserId())
                    .setPhoneNumber(user.getPhoneNumber())
                    .setFirstName(user.getFirstName())
                    .setLastName(user.getLastName())
                    .setGender(user.getGender())
                    .setDateOfBirth(user.getDateOfBirth().toString())
                    .setAvatar(user.getAvatar() == null ? "" : user.getAvatar())
                    .setIsActive(Boolean.TRUE.equals(user.getIsActive()))
                    .setEmail(user.getEmail() == null ? "" : user.getEmail())
                    .build());
            responseObserver.onCompleted();
        } catch (ResourceNotFoundException ex) {
            responseObserver.onError(Status.NOT_FOUND.withDescription(ex.getMessage()).asRuntimeException());
        } catch (Exception ex) {
            responseObserver.onError(Status.INTERNAL.withDescription("Unable to get user profile").asRuntimeException());
        }
    }
}
