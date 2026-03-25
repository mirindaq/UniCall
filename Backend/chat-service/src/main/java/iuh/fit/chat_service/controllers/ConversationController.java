package iuh.fit.chat_service.controllers;

import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.dtos.response.CreateGroupConversationResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.services.ConversationService;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${api.prefix:/api/v1}/conversations")
@RequiredArgsConstructor
public class ConversationController {
    private static final String USER_ID_HEADER = "X-User-Id";

    private final ConversationService conversationService;

    @PostMapping("/groups")
    public ResponseEntity<ResponseSuccess<CreateGroupConversationResponse>> createGroupConversation(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @Valid @RequestBody CreateGroupConversationRequest request
    ) {
        Conversation conversation = conversationService.createGroupConversation(currentIdentityUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                new ResponseSuccess<>(
                        HttpStatus.CREATED,
                        "Create group conversation success",
                        CreateGroupConversationResponse.from(conversation)
                )
        );
    }
}
