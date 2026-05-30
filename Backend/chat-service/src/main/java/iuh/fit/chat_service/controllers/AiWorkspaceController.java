package iuh.fit.chat_service.controllers;

import iuh.fit.chat_service.dtos.request.AskAiAssistantThreadRequest;
import iuh.fit.chat_service.dtos.request.CreateAiAssistantThreadRequest;
import iuh.fit.chat_service.dtos.response.AiAssistantThreadDetailResponse;
import iuh.fit.chat_service.dtos.response.AiAssistantThreadSummaryResponse;
import iuh.fit.chat_service.dtos.response.AiAssistantTurnResponse;
import iuh.fit.chat_service.services.AiWorkspaceService;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("${api.prefix:/api/v1}/chat/ai")
@RequiredArgsConstructor
public class AiWorkspaceController {
    private static final String USER_ID_HEADER = "X-User-Id";

    private final AiWorkspaceService aiWorkspaceService;

    @PostMapping("/threads")
    public ResponseEntity<ResponseSuccess<AiAssistantThreadSummaryResponse>> createThread(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @RequestBody(required = false) CreateAiAssistantThreadRequest request
    ) {
        requireUser(identityUserId);
        AiAssistantThreadSummaryResponse data = aiWorkspaceService.createThread(identityUserId, request);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Tạo AI thread thành công", data)
        );
    }

    @GetMapping("/threads")
    public ResponseEntity<ResponseSuccess<List<AiAssistantThreadSummaryResponse>>> listThreads(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId
    ) {
        requireUser(identityUserId);
        List<AiAssistantThreadSummaryResponse> data = aiWorkspaceService.listThreads(identityUserId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Lấy danh sách AI thread thành công", data)
        );
    }

    @GetMapping("/threads/{threadId}")
    public ResponseEntity<ResponseSuccess<AiAssistantThreadDetailResponse>> getThreadDetail(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String threadId
    ) {
        requireUser(identityUserId);
        AiAssistantThreadDetailResponse data = aiWorkspaceService.getThreadDetail(identityUserId, threadId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Lấy chi tiết AI thread thành công", data)
        );
    }

    @PostMapping("/threads/{threadId}/ask")
    public ResponseEntity<ResponseSuccess<AiAssistantTurnResponse>> askThread(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String threadId,
            @Valid @RequestBody AskAiAssistantThreadRequest request
    ) {
        requireUser(identityUserId);
        AiAssistantTurnResponse data = aiWorkspaceService.askThread(identityUserId, threadId, request);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Hỏi trợ lý AI thành công", data)
        );
    }

    private static void requireUser(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new UnauthenticatedException("Missing authenticated user header");
        }
    }
}
