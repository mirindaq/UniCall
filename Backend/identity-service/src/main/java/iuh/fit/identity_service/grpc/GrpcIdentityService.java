package iuh.fit.identity_service.grpc;

import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.identity_service.services.AuthService;
import iuh.fit.unicall.grpc.identity.v1.IdentityServiceGrpc;
import iuh.fit.unicall.grpc.identity.v1.VerifyPasswordRequest;
import iuh.fit.unicall.grpc.identity.v1.VerifyPasswordResponse;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GrpcIdentityService extends IdentityServiceGrpc.IdentityServiceImplBase {
    private final AuthService authService;

    @Override
    public void verifyPassword(
            VerifyPasswordRequest request,
            StreamObserver<VerifyPasswordResponse> responseObserver
    ) {
        try {
            authService.verifyPassword(
                    request.getIdentityUserId(),
                    request.getPhoneNumber(),
                    request.getPassword()
            );

            responseObserver.onNext(VerifyPasswordResponse.newBuilder()
                    .setVerified(true)
                    .build());
            responseObserver.onCompleted();
        } catch (UnauthenticatedException ex) {
            responseObserver.onError(Status.UNAUTHENTICATED.withDescription(ex.getMessage()).asRuntimeException());
        } catch (IllegalArgumentException ex) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription(ex.getMessage()).asRuntimeException());
        } catch (Exception ex) {
            responseObserver.onError(Status.INTERNAL.withDescription("Unable to verify password").asRuntimeException());
        }
    }
}
