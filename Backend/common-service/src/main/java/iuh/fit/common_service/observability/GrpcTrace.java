package iuh.fit.common_service.observability;

import io.grpc.stub.AbstractStub;

public final class GrpcTrace {

    private GrpcTrace() {
    }

    public static <T extends AbstractStub<T>> T withTrace(T stub) {
        return stub.withInterceptors(TraceGrpcClientInterceptor.INSTANCE);
    }
}
