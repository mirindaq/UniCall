package iuh.fit.api_gateway.config;

import org.springframework.core.Ordered;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
public class CookieAccessTokenPreAuthWebFilter implements WebFilter, Ordered {

    private static final String ACCESS_TOKEN_COOKIE_NAME = "unicall_at";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String authorizationHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authorizationHeader)) {
            return chain.filter(exchange);
        }

        HttpCookie accessCookie = exchange.getRequest().getCookies().getFirst(ACCESS_TOKEN_COOKIE_NAME);
        if (accessCookie == null || !StringUtils.hasText(accessCookie.getValue())) {
            return chain.filter(exchange);
        }

        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(headers -> {
                    if (!StringUtils.hasText(headers.getFirst(HttpHeaders.AUTHORIZATION))) {
                        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + accessCookie.getValue().trim());
                    }
                })
                .build();

        return chain.filter(exchange.mutate().request(request).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
