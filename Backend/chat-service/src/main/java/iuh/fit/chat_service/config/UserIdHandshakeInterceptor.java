package iuh.fit.chat_service.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
public class UserIdHandshakeInterceptor implements HandshakeInterceptor {
    private static final String USER_ID_HEADER = "X-User-Id";

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
        String userId = servletRequest.getServletRequest().getHeader(USER_ID_HEADER);
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
}
