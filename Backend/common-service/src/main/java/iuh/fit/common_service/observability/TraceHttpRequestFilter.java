package iuh.fit.common_service.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class TraceHttpRequestFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String traceId = TraceContext.resolve(request.getHeader(TraceContext.HTTP_HEADER));
        String previousTraceId = MDC.get(TraceContext.MDC_TRACE_ID);

        MDC.put(TraceContext.MDC_TRACE_ID, traceId);
        MDC.put(TraceContext.MDC_METHOD, request.getMethod());
        MDC.put(TraceContext.MDC_PATH, request.getRequestURI());
        response.setHeader(TraceContext.HTTP_HEADER, traceId);

        try {
            filterChain.doFilter(request, response);
            logRequest(response.getStatus(), startedAt, "request completed", null);
        } catch (ServletException | IOException | RuntimeException ex) {
            int status = response.getStatus() >= 400 ? response.getStatus() : HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
            logRequest(status, startedAt, "request failed", ex);
            throw ex;
        } finally {
            TraceContext.restore(TraceContext.MDC_TRACE_ID, previousTraceId);
            MDC.remove(TraceContext.MDC_METHOD);
            MDC.remove(TraceContext.MDC_PATH);
            MDC.remove(TraceContext.MDC_STATUS);
            MDC.remove(TraceContext.MDC_DURATION_MS);
        }
    }

    private void logRequest(int status, long startedAt, String message, Exception ex) {
        long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
        MDC.put(TraceContext.MDC_STATUS, Integer.toString(status));
        MDC.put(TraceContext.MDC_DURATION_MS, Long.toString(durationMs));

        if (ex == null) {
            log.info(message);
            return;
        }

        log.error(message, ex);
    }
}
