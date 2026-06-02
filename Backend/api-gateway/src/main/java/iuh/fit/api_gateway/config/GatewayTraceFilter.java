package iuh.fit.api_gateway.config;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Slf4j
public class GatewayTraceFilter implements GlobalFilter, Ordered {
    public static final String TRACE_HEADER = "X-Correlation-Id";
    private static final String MDC_TRACE_ID = "trace_id";
    private static final String MDC_METHOD = "method";
    private static final String MDC_PATH = "path";
    private static final String MDC_STATUS = "status";
    private static final String MDC_DURATION_MS = "duration_ms";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        long startedAt = System.nanoTime();
        String traceId = resolve(exchange.getRequest().getHeaders().getFirst(TRACE_HEADER));
        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(headers -> headers.set(TRACE_HEADER, traceId))
                .build();

        exchange.getResponse().getHeaders().set(TRACE_HEADER, traceId);

        ServerWebExchange tracedExchange = exchange.mutate().request(request).build();
        AtomicReference<Throwable> errorRef = new AtomicReference<>();

        return chain.filter(tracedExchange)
                .doOnError(errorRef::set)
                .doFinally(signalType -> logRequest(tracedExchange, traceId, startedAt, errorRef.get()));
    }

    private void logRequest(ServerWebExchange exchange, String traceId, long startedAt, Throwable error) {
        String previousTraceId = MDC.get(MDC_TRACE_ID);
        try {
            MDC.put(MDC_TRACE_ID, traceId);
            MDC.put(MDC_METHOD, exchange.getRequest().getMethod().name());
            MDC.put(MDC_PATH, exchange.getRequest().getPath().pathWithinApplication().value());
            MDC.put(MDC_STATUS, Integer.toString(resolveStatus(exchange, error)));
            MDC.put(MDC_DURATION_MS, Long.toString((System.nanoTime() - startedAt) / 1_000_000));

            if (error == null) {
                log.info("request completed");
                return;
            }

            log.error("request failed", error);
        } finally {
            restore(MDC_TRACE_ID, previousTraceId);
            MDC.remove(MDC_METHOD);
            MDC.remove(MDC_PATH);
            MDC.remove(MDC_STATUS);
            MDC.remove(MDC_DURATION_MS);
        }
    }

    private int resolveStatus(ServerWebExchange exchange, Throwable error) {
        if (exchange.getResponse().getStatusCode() != null) {
            return exchange.getResponse().getStatusCode().value();
        }
        return error == null ? HttpStatus.OK.value() : HttpStatus.INTERNAL_SERVER_ERROR.value();
    }

    private String resolve(String candidate) {
        if (StringUtils.hasText(candidate)) {
            return candidate.trim();
        }
        return UUID.randomUUID().toString();
    }

    private void restore(String key, String previousValue) {
        if (previousValue == null) {
            MDC.remove(key);
            return;
        }
        MDC.put(key, previousValue);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
