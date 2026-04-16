package iuh.fit.chat_service.controllers;

import iuh.fit.chat_service.config.ChatWsConstants;
import iuh.fit.chat_service.dtos.request.ConversationCallSignalRequest;
import iuh.fit.chat_service.services.ConversationCallService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class CallStompController {

    private final ConversationCallService conversationCallService;

    @MessageMapping("/call.signal")
    public void sendSignal(ConversationCallSignalRequest payload, StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            conversationCallService.sendSignal(principal.getName(), payload);
            return;
        }

        if (accessor.getSessionAttributes() == null) {
            return;
        }
        Object raw = accessor.getSessionAttributes().get(ChatWsConstants.USER_ID_SESSION_ATTR);
        if (!(raw instanceof String userId) || userId.isBlank()) {
            return;
        }
        conversationCallService.sendSignal(userId, payload);
    }
}
