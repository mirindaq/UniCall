package iuh.fit.chat_service.controllers;

import iuh.fit.chat_service.config.ChatWsConstants;
import iuh.fit.chat_service.dtos.request.ChatSendStompPayload;
import iuh.fit.chat_service.services.ChatMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatStompController {

    private final ChatMessageService chatMessageService;

    @MessageMapping("/chat.send")
    public void sendMessage(ChatSendStompPayload payload, StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            chatMessageService.sendFromStomp(principal.getName(), payload);
            return;
        }

        if (accessor.getSessionAttributes() == null) {
            return;
        }
        Object raw = accessor.getSessionAttributes().get(ChatWsConstants.USER_ID_SESSION_ATTR);
        if (!(raw instanceof String userId) || userId.isBlank()) {
            return;
        }
        chatMessageService.sendFromStomp(userId, payload);
    }
}
