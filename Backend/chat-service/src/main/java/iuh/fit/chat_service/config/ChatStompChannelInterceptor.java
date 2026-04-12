package iuh.fit.chat_service.config;

import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class ChatStompChannelInterceptor implements ChannelInterceptor {
    private static final Pattern CONVERSATION_TOPIC =
            Pattern.compile("^/topic/conversations\\.([^.]+)\\.messages$");
    private static final Pattern CONVERSATION_CALL_TOPIC =
            Pattern.compile("^/topic/conversations\\.([^.]+)\\.calls$");
    private static final String USER_EVENT_QUEUE = "/user/queue/events";

    private final ChatConversationService chatConversationService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String userId = requireUserId(accessor);
            if (accessor.getUser() == null) {
                accessor.setUser(() -> userId);
            }
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String userId = requireUserId(accessor);
            String dest = accessor.getDestination();
            if (dest == null) {
                throw new InvalidParamException("Thiếu destination STOMP");
            }
            Matcher messageMatcher = CONVERSATION_TOPIC.matcher(dest);
            Matcher callMatcher = CONVERSATION_CALL_TOPIC.matcher(dest);
            if (USER_EVENT_QUEUE.equals(dest)) {
                return message;
            }
            boolean isMessageTopic = messageMatcher.matches();
            boolean isCallTopic = callMatcher.matches();
            if (!isMessageTopic && !isCallTopic) {
                throw new InvalidParamException("Destination subscribe không hợp lệ");
            }
            String conversationId = isMessageTopic ? messageMatcher.group(1) : callMatcher.group(1);
            chatConversationService.requireParticipant(conversationId, userId);
            return message;
        }

        if (StompCommand.SEND.equals(accessor.getCommand())) {
            requireUserId(accessor);
            return message;
        }

        return message;
    }

    private static String requireUserId(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }

        Map<String, Object> sessionAttrs = accessor.getSessionAttributes();
        if (sessionAttrs == null) {
            throw new InvalidParamException("Thiếu session WebSocket");
        }
        Object raw = sessionAttrs.get(ChatWsConstants.USER_ID_SESSION_ATTR);
        if (!(raw instanceof String userId) || userId.isBlank()) {
            throw new InvalidParamException("Thiếu user trên phiên chat");
        }
        return userId;
    }
}
