package iuh.fit.common_service.observability;

import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestTemplate;

public final class TraceRestTemplate {

    private TraceRestTemplate() {
    }

    public static RestTemplate instrument(RestTemplate restTemplate) {
        restTemplate.getInterceptors().add((request, body, execution) -> {
            HttpHeaders headers = request.getHeaders();
            if (!headers.containsHeader(TraceContext.HTTP_HEADER)) {
                headers.set(TraceContext.HTTP_HEADER, TraceContext.currentOrCreateTraceId());
            }
            return execution.execute(request, body);
        });
        return restTemplate;
    }
}
