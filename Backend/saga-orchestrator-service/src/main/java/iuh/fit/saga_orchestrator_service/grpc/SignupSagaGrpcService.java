package iuh.fit.saga_orchestrator_service.grpc;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.saga_orchestrator_service.services.SignupSagaOrchestrationService;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaRequest;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaResponse;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaServiceGrpc;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SignupSagaGrpcService extends SignupSagaServiceGrpc.SignupSagaServiceImplBase {
    private final SignupSagaOrchestrationService signupSagaOrchestrationService;

    @Override
    public void registerUser(SignupSagaRequest request, StreamObserver<SignupSagaResponse> responseObserver) {
        try {
            SignupSagaResponse response = signupSagaOrchestrationService.register(request);
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (ConflictException ex) {
            responseObserver.onError(Status.ALREADY_EXISTS.withDescription(ex.getMessage()).asRuntimeException());
        } catch (InvalidParamException ex) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription(ex.getMessage()).asRuntimeException());
        } catch (Exception ex) {
            responseObserver.onError(Status.INTERNAL.withDescription("Unable to execute signup saga").asRuntimeException());
        }
    }
}
