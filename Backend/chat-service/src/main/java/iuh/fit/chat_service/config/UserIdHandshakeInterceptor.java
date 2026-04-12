package iuh.fit.chat_service.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Component
public class UserIdHandshakeInterceptor implements HandshakeInterceptor {
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return false;
        }
        String authorization = servletRequest.getServletRequest().getHeader(AUTHORIZATION_HEADER);
        String userId = extractSubFromBearerToken(authorization);
        if (userId == null || userId.isBlank()) {
            return false;
        }
        attributes.put(ChatWsConstants.USER_ID_SESSION_ATTR, userId);
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
        // no-op
    }

    private static String extractSubFromBearerToken(String authorization) {
        if (!StringUtils.hasText(authorization) || !authorization.startsWith(BEARER_PREFIX)) {
            return "";
        }
        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        if (!StringUtils.hasText(token)) {
            return "";
        }

        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                return "";
            }
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int subKey = payloadJson.indexOf("\"sub\"");
            if (subKey < 0) {
                return "";
            }
            int colon = payloadJson.indexOf(':', subKey);
            int firstQuote = payloadJson.indexOf('"', colon + 1);
            int secondQuote = payloadJson.indexOf('"', firstQuote + 1);
            if (colon < 0 || firstQuote < 0 || secondQuote < 0) {
                return "";
            }
            return payloadJson.substring(firstQuote + 1, secondQuote);
        } catch (Exception ignored) {
            return "";
        }
    }
}
