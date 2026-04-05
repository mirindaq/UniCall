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

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class WebSocketAccessTokenQueryPreAuthWebFilter implements WebFilter, Ordered {

    private static final String CHAT_WS_PREFIX = "/api-gateway/chat-service/ws";
    private static final String ACCESS_TOKEN_COOKIE_NAME = "unicall_at";
    private static final String ACCESS_TOKEN_PARAM = "access_token";
    private static final String USER_ID_HEADER = "X-User-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String authorizationHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authorizationHeader)) {
            return chain.filter(exchange);
        }

        boolean isChatWs = isChatWsPath(path);
        String token = resolveAccessToken(exchange, isChatWs);
        if (!StringUtils.hasText(token)) {
            return chain.filter(exchange);
        }

        String extractedSub = isChatWs ? extractSubFromJwtPayload(token) : "";
        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(headers -> {
                    if (!StringUtils.hasText(headers.getFirst(HttpHeaders.AUTHORIZATION))) {
                        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + token.trim());
                    }
                    if (!StringUtils.hasText(headers.getFirst(USER_ID_HEADER)) && StringUtils.hasText(extractedSub)) {
                        headers.set(USER_ID_HEADER, extractedSub);
                    }
                })
                .build();

        return chain.filter(exchange.mutate().request(request).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private static boolean isChatWsPath(String path) {
        return path != null && path.startsWith(CHAT_WS_PREFIX);
    }

    private static String resolveAccessToken(ServerWebExchange exchange, boolean isChatWs) {
        HttpCookie accessCookie = exchange.getRequest().getCookies().getFirst(ACCESS_TOKEN_COOKIE_NAME);
        if (accessCookie != null && StringUtils.hasText(accessCookie.getValue())) {
            return accessCookie.getValue();
        }

        if (isChatWs) {
            String tokenFromQuery = exchange.getRequest().getQueryParams().getFirst(ACCESS_TOKEN_PARAM);
            if (StringUtils.hasText(tokenFromQuery)) {
                return tokenFromQuery;
            }
        }

        return "";
    }

    private static String extractSubFromJwtPayload(String jwtToken) {
        try {
            String[] parts = jwtToken.split("\\.");
            if (parts.length < 2) {
                return "";
            }
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int subKey = payload.indexOf("\"sub\"");
            if (subKey < 0) {
                return "";
            }
            int colon = payload.indexOf(':', subKey);
            int firstQuote = payload.indexOf('"', colon + 1);
            int secondQuote = payload.indexOf('"', firstQuote + 1);
            if (colon < 0 || firstQuote < 0 || secondQuote < 0) {
                return "";
            }
            return payload.substring(firstQuote + 1, secondQuote);
        } catch (Exception ignored) {
            return "";
        }
    }
}
