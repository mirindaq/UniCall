package iuh.fit.common_service.observability;

import io.grpc.CallOptions;
import io.grpc.Channel;
import io.grpc.ClientCall;
import io.grpc.ClientInterceptor;
import io.grpc.ForwardingClientCall;
import io.grpc.Metadata;
import io.grpc.MethodDescriptor;

public class TraceGrpcClientInterceptor implements ClientInterceptor {
    public static final TraceGrpcClientInterceptor INSTANCE = new TraceGrpcClientInterceptor();

    static final Metadata.Key<String> TRACE_METADATA_KEY = Metadata.Key.of(
            TraceContext.GRPC_METADATA_KEY,
            Metadata.ASCII_STRING_MARSHALLER
    );

    @Override
    public <ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
            MethodDescriptor<ReqT, RespT> method,
            CallOptions callOptions,
            Channel next
    ) {
        return new ForwardingClientCall.SimpleForwardingClientCall<>(next.newCall(method, callOptions)) {
            @Override
            public void start(Listener<RespT> responseListener, Metadata headers) {
                headers.put(TRACE_METADATA_KEY, TraceContext.currentOrCreateTraceId());
                super.start(responseListener, headers);
            }
        };
    }
}
