package iuh.fit.identity_service.config;

import iuh.fit.common_service.exceptions.InvalidParamException;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.Map;

@Component
public class IdentityStompChannelInterceptor implements ChannelInterceptor {
    private static final String SECURITY_EVENT_QUEUE = "/user/queue/security-events";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String userId = extractUserIdFromConnect(accessor);
            if (!StringUtils.hasText(userId)) {
                throw new InvalidParamException("Thiếu authentication cho identity websocket");
            }

            Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
            if (sessionAttrs != null) {
                sessionAttrs.put(IdentityWsConstants.USER_ID_SESSION_ATTR, userId);
            }
            if (accessor.getUser() == null) {
                accessor.setUser(() -> userId);
            }
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            requireUserId(accessor);
            String destination = accessor.getDestination();
            if (!SECURITY_EVENT_QUEUE.equals(destination)) {
                throw new InvalidParamException("Destination subscribe identity websocket không hợp lệ");
            }
        }

        return message;
    }

    private static String extractUserIdFromConnect(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String userId = UserIdHandshakeInterceptor.extractSubFromJwt(authorization.substring(7));
            if (!userId.isBlank()) {
                return userId;
            }
        }

        Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
        Object rawUserId = sessionAttrs == null ? null : sessionAttrs.get(IdentityWsConstants.USER_ID_SESSION_ATTR);
        return rawUserId instanceof String userId ? userId : "";
    }

    private static String requireUserId(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }

        Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
        Object rawUserId = sessionAttrs == null ? null : sessionAttrs.get(IdentityWsConstants.USER_ID_SESSION_ATTR);
        if (rawUserId instanceof String userId && !userId.isBlank()) {
            return userId;
        }
        throw new InvalidParamException("Thiếu user trên phiên identity websocket");
    }
}
