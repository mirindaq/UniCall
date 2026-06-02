package iuh.fit.common_service.observability;

import org.slf4j.MDC;
import org.springframework.util.StringUtils;

import java.util.UUID;

public final class TraceContext {
    public static final String HTTP_HEADER = "X-Correlation-Id";
    public static final String RABBIT_HEADER = "x-correlation-id";
    public static final String GRPC_METADATA_KEY = "x-correlation-id";
    public static final String MDC_TRACE_ID = "trace_id";
    public static final String MDC_METHOD = "method";
    public static final String MDC_PATH = "path";
    public static final String MDC_STATUS = "status";
    public static final String MDC_DURATION_MS = "duration_ms";

    private TraceContext() {
    }

    public static String resolve(String candidate) {
        if (StringUtils.hasText(candidate)) {
            return candidate.trim();
        }
        return UUID.randomUUID().toString();
    }

    public static String currentTraceId() {
        return MDC.get(MDC_TRACE_ID);
    }

    public static String currentOrCreateTraceId() {
        String traceId = currentTraceId();
        if (StringUtils.hasText(traceId)) {
            return traceId;
        }

        traceId = resolve(null);
        MDC.put(MDC_TRACE_ID, traceId);
        return traceId;
    }

    public static Scope open(String traceId) {
        return openResolved(resolve(traceId));
    }

    public static Scope openResolved(String traceId) {
        String previousTraceId = MDC.get(MDC_TRACE_ID);
        MDC.put(MDC_TRACE_ID, traceId);
        return () -> restore(MDC_TRACE_ID, previousTraceId);
    }

    public static void restore(String key, String previousValue) {
        if (previousValue == null) {
            MDC.remove(key);
        } else {
            MDC.put(key, previousValue);
        }
    }

    @FunctionalInterface
    public interface Scope extends AutoCloseable {
        @Override
        void close();
    }
}
