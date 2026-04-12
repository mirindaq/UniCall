package iuh.fit.chat_service.controllers;

import iuh.fit.chat_service.dtos.request.CreateDirectConversationRequest;
import iuh.fit.chat_service.dtos.request.SendChatMessageRequest;
import iuh.fit.chat_service.dtos.response.AttachmentResponse;
import iuh.fit.chat_service.dtos.response.ConversationResponse;
import iuh.fit.chat_service.dtos.response.FileUploadResponse;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.chat_service.services.ChatMessageService;
import iuh.fit.chat_service.services.FileUploadService;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("${api.prefix:/api/v1}/chat")
@RequiredArgsConstructor
public class ChatController {

    private static final String USER_ID_HEADER = "X-User-Id";

    private final ChatConversationService chatConversationService;
    private final ChatMessageService chatMessageService;
    private final FileUploadService fileUploadService;

    @GetMapping("/conversations")
    public ResponseEntity<ResponseSuccess<List<ConversationResponse>>> listConversations(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId
    ) {
        requireUser(identityUserId);
        List<ConversationResponse> data = chatConversationService.listMyConversations(identityUserId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Lấy danh sách hội thoại thành công", data)
        );
    }

    @PostMapping("/conversations/direct")
    public ResponseEntity<ResponseSuccess<ConversationResponse>> createOrGetDirect(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @Valid @RequestBody CreateDirectConversationRequest request
    ) {
        requireUser(identityUserId);
        ConversationResponse data = chatConversationService.getOrCreateDirect(identityUserId, request);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Đồng bộ hội thoại 1-1 thành công", data)
        );
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ResponseSuccess<PageResponse<MessageResponse>>> listMessages(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String conversationId,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "20") int limit
    ) {
        requireUser(identityUserId);
        PageResponse<MessageResponse> data = chatMessageService.listMessages(identityUserId, conversationId, page, limit);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Lấy tin nhắn thành công", data)
        );
    }

    @GetMapping("/conversations/{conversationId}/messages/search")
    public ResponseEntity<ResponseSuccess<PageResponse<MessageResponse>>> searchMessages(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String conversationId,
            @RequestParam(name = "keyword") String keyword,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        requireUser(identityUserId);
        PageResponse<MessageResponse> data = chatMessageService.searchMessages(identityUserId, conversationId, keyword, page, limit);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Tìm kiếm tin nhắn thành công", data)
        );
    }

    @GetMapping("/conversations/{conversationId}/messages/{messageId}")
    public ResponseEntity<ResponseSuccess<MessageResponse>> getMessageById(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String conversationId,
            @PathVariable String messageId
    ) {
        requireUser(identityUserId);
        MessageResponse data = chatMessageService.getMessageById(identityUserId, conversationId, messageId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Lấy tin nhắn thành công", data)
        );
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ResponseSuccess<MessageResponse>> sendMessage(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String conversationId,
            @Valid @RequestBody SendChatMessageRequest request
    ) {
        requireUser(identityUserId);
        MessageResponse data = chatMessageService.sendRest(identityUserId, conversationId, request);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Gửi tin nhắn thành công", data)
        );
    }

    @PostMapping("/conversations/{conversationId}/messages/{messageId}/recall")
    public ResponseEntity<ResponseSuccess<MessageResponse>> recallMessage(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String conversationId,
            @PathVariable String messageId
    ) {
        requireUser(identityUserId);
        MessageResponse data = chatMessageService.recallMessage(identityUserId, conversationId, messageId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Thu hồi tin nhắn thành công", data)
        );
    }

    @DeleteMapping("/conversations/{conversationId}/messages/{messageId}/self")
    public ResponseEntity<ResponseSuccess<Void>> hideMessageForMe(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String conversationId,
            @PathVariable String messageId
    ) {
        requireUser(identityUserId);
        chatMessageService.hideMessageForMe(identityUserId, conversationId, messageId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Đã xóa tin nhắn ở phía bạn", null)
        );
    }

    @GetMapping("/conversations/{conversationId}/attachments")
    public ResponseEntity<ResponseSuccess<List<AttachmentResponse>>> getAttachments(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @PathVariable String conversationId,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "senderId", required = false) String senderId,
            @RequestParam(name = "fromDate", required = false) String fromDate,
            @RequestParam(name = "toDate", required = false) String toDate,
            @RequestParam(name = "search", required = false) String search
    ) {
        requireUser(identityUserId);
        List<AttachmentResponse> data = chatMessageService.getAttachments(
                identityUserId,
                conversationId,
                type,
                senderId,
                fromDate,
                toDate,
                search
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Lấy attachments thành công", data)
        );
    }

    @PostMapping(value = "/upload-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseSuccess<FileUploadResponse>> uploadFile(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @RequestParam("file") MultipartFile file
    ) {
        requireUser(identityUserId);
        FileUploadResponse data = fileUploadService.uploadFile(file);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Upload file thành công", data)
        );
    }

    private static void requireUser(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new UnauthenticatedException("Missing authenticated user header");
        }
    }
}
