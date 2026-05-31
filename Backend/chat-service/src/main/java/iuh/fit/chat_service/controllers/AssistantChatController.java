package iuh.fit.chat_service.controllers;

import iuh.fit.chat_service.dtos.request.AssistantAskRequest;
import iuh.fit.chat_service.dtos.response.AssistantAskResponse;
import iuh.fit.chat_service.dtos.response.AssistantThreadMessageResponse;
import iuh.fit.chat_service.dtos.response.AssistantThreadResponse;
import iuh.fit.chat_service.services.AssistantChatHistoryService;
import iuh.fit.chat_service.services.AssistantChatOrchestratorService;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${api.prefix:/api/v1}/ai/chat")
@RequiredArgsConstructor
public class AssistantChatController {

    private static final String USER_ID_HEADER = "X-User-Id";

    private final AssistantChatOrchestratorService assistantChatOrchestratorService;
    private final AssistantChatHistoryService assistantChatHistoryService;

    @PostMapping("/ask")
    public ResponseEntity<ResponseSuccess<AssistantAskResponse>> ask(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @Valid @RequestBody AssistantAskRequest request
    ) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new UnauthenticatedException("Missing authenticated user header");
        }
        AssistantAskResponse data = assistantChatOrchestratorService.ask(identityUserId, request);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "AI xử lý câu hỏi thành công", data)
        );
    }

    @GetMapping("/thread")
    public ResponseEntity<ResponseSuccess<AssistantThreadResponse>> getDefaultThread(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId
    ) {
        requireUser(identityUserId);
        AssistantThreadResponse data = assistantChatHistoryService.getDefaultThreadInfo(identityUserId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Lấy thread AI thành công", data)
        );
    }

    @GetMapping("/messages")
    public ResponseEntity<ResponseSuccess<PageResponse<AssistantThreadMessageResponse>>> listMessages(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @RequestParam(value = "threadId", required = false) String threadId,
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "limit", defaultValue = "50") Integer limit
    ) {
        requireUser(identityUserId);
        PageResponse<AssistantThreadMessageResponse> data = assistantChatHistoryService
                .listMessages(identityUserId, threadId, page, limit);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Lấy lịch sử AI chat thành công", data)
        );
    }

    private static void requireUser(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new UnauthenticatedException("Missing authenticated user header");
        }
    }
}
