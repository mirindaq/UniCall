package iuh.fit.saga_orchestrator_service.grpc;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.saga_orchestrator_service.orchestrator.SignupSagaOrchestrator;
import iuh.fit.unicall.grpc.saga.signup.v1.UserRequest;
import iuh.fit.unicall.grpc.saga.signup.v1.UserResponse;
import iuh.fit.unicall.grpc.saga.signup.v1.UserServiceGrpc;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class GrpcUserService extends UserServiceGrpc.UserServiceImplBase {
    private final SignupSagaOrchestrator signupSagaOrchestrator;

    @Override
    public void registerUser(UserRequest request, StreamObserver<UserResponse> responseObserver) {
        try {
            UserResponse response = signupSagaOrchestrator.register(request);
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (ConflictException ex) {
            responseObserver.onError(Status.ALREADY_EXISTS.withDescription(ex.getMessage()).asRuntimeException());
        } catch (InvalidParamException ex) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription(ex.getMessage()).asRuntimeException());
        } catch (Exception ex) {
            log.error("Signup saga failed for phoneNumber={}: {}", request.getPhoneNumber(), ex.getMessage(), ex);
            String message = ex.getMessage() == null || ex.getMessage().isBlank()
                    ? "Unable to execute signup saga"
                    : ex.getMessage();
            responseObserver.onError(Status.INTERNAL.withDescription(message).asRuntimeException());
        }
    }
}
