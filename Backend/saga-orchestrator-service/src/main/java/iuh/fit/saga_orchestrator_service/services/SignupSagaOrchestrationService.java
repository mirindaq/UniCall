package iuh.fit.saga_orchestrator_service.services;

import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaRequest;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaResponse;

public interface SignupSagaOrchestrationService {
    SignupSagaResponse register(SignupSagaRequest request);
}
