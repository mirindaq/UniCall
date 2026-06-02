package iuh.fit.common_service.observability;

import io.grpc.ForwardingServerCallListener;
import io.grpc.ForwardingServerCall;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import io.grpc.Status;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

@Component
@ConditionalOnClass(ServerInterceptor.class)
@Slf4j
public class TraceGrpcServerInterceptor implements ServerInterceptor {

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next
    ) {
        String traceId = TraceContext.resolve(headers.get(TraceGrpcClientInterceptor.TRACE_METADATA_KEY));
        long startedAt = System.nanoTime();
        String grpcMethod = call.getMethodDescriptor().getFullMethodName();
        AtomicReference<Status> statusRef = new AtomicReference<>(Status.OK);
        AtomicBoolean logged = new AtomicBoolean(false);

        ServerCall<ReqT, RespT> tracedCall = new ForwardingServerCall.SimpleForwardingServerCall<>(call) {
            @Override
            public void close(Status status, Metadata trailers) {
                statusRef.set(status);
                super.close(status, trailers);
            }
        };

        ServerCall.Listener<ReqT> listener;
        try (TraceContext.Scope ignored = TraceContext.openResolved(traceId)) {
            listener = next.startCall(tracedCall, headers);
        }

        return new ForwardingServerCallListener.SimpleForwardingServerCallListener<>(listener) {
            @Override
            public void onMessage(ReqT message) {
                try (TraceContext.Scope ignored = TraceContext.openResolved(traceId);
                     GrpcMdcScope ignoredGrpc = openGrpcMdc(grpcMethod, null, startedAt)) {
                    super.onMessage(message);
                }
            }

            @Override
            public void onHalfClose() {
                try (TraceContext.Scope ignored = TraceContext.openResolved(traceId);
                     GrpcMdcScope ignoredGrpc = openGrpcMdc(grpcMethod, null, startedAt)) {
                    super.onHalfClose();
                }
            }

            @Override
            public void onCancel() {
                try (TraceContext.Scope ignored = TraceContext.openResolved(traceId);
                    GrpcMdcScope ignoredGrpc = openGrpcMdc(grpcMethod, Status.CANCELLED, startedAt)) {
                    super.onCancel();
                    logOnce(logged, "grpc request cancelled", Status.CANCELLED);
                }
            }

            @Override
            public void onComplete() {
                try (TraceContext.Scope ignored = TraceContext.openResolved(traceId);
                     GrpcMdcScope ignoredGrpc = openGrpcMdc(grpcMethod, statusRef.get(), startedAt)) {
                    super.onComplete();
                    logOnce(logged, "grpc request completed", statusRef.get());
                }
            }

            @Override
            public void onReady() {
                try (TraceContext.Scope ignored = TraceContext.openResolved(traceId);
                     GrpcMdcScope ignoredGrpc = openGrpcMdc(grpcMethod, null, startedAt)) {
                    super.onReady();
                }
            }
        };
    }

    private GrpcMdcScope openGrpcMdc(String grpcMethod, Status status, long startedAt) {
        String previousMethod = MDC.get(TraceContext.MDC_METHOD);
        String previousPath = MDC.get(TraceContext.MDC_PATH);
        String previousStatus = MDC.get(TraceContext.MDC_STATUS);
        String previousDuration = MDC.get(TraceContext.MDC_DURATION_MS);

        MDC.put(TraceContext.MDC_METHOD, "GRPC");
        MDC.put(TraceContext.MDC_PATH, grpcMethod);
        if (status != null) {
            MDC.put(TraceContext.MDC_STATUS, status.getCode().name());
            MDC.put(TraceContext.MDC_DURATION_MS, Long.toString((System.nanoTime() - startedAt) / 1_000_000));
        }

        return () -> {
            TraceContext.restore(TraceContext.MDC_METHOD, previousMethod);
            TraceContext.restore(TraceContext.MDC_PATH, previousPath);
            TraceContext.restore(TraceContext.MDC_STATUS, previousStatus);
            TraceContext.restore(TraceContext.MDC_DURATION_MS, previousDuration);
        };
    }

    private void logOnce(AtomicBoolean logged, String message, Status status) {
        if (!logged.compareAndSet(false, true)) {
            return;
        }

        if (status != null && !status.isOk()) {
            log.warn(message);
            return;
        }

        log.info(message);
    }

    @FunctionalInterface
    private interface GrpcMdcScope extends AutoCloseable {
        @Override
        void close();
    }
}
