package iuh.fit.chat_service.controllers;

import iuh.fit.chat_service.dtos.request.AddGroupMembersRequest;
import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.dtos.request.TransferGroupAdminRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupMemberRoleRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupManagementSettingsRequest;
import iuh.fit.chat_service.dtos.request.UpdateMemberNicknameRequest;
import iuh.fit.chat_service.dtos.response.CreateGroupConversationResponse;
import iuh.fit.chat_service.dtos.response.DissolveGroupConversationResponse;
import iuh.fit.chat_service.dtos.response.ManageGroupParticipantsResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.services.ConversationService;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDateTime;

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

    @PostMapping("/{conversationId}/members")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> addGroupMembers(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId,
            @Valid @RequestBody AddGroupMembersRequest request
    ) {
        ManageGroupParticipantsResponse result = conversationService.addGroupMembers(
                currentIdentityUserId,
                conversationId,
                request
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Add group members success",
                        result
                )
        );
    }

    @DeleteMapping("/{conversationId}/members/{memberIdentityUserId}")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> removeGroupMember(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId,
            @PathVariable String memberIdentityUserId
    ) {
        Conversation conversation = conversationService.removeGroupMember(
                currentIdentityUserId,
                conversationId,
                memberIdentityUserId
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Remove group member success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @PatchMapping("/{conversationId}/members/{memberIdentityUserId}/role")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> updateGroupMemberRole(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId,
            @PathVariable String memberIdentityUserId,
            @Valid @RequestBody UpdateGroupMemberRoleRequest request
    ) {
        Conversation conversation = conversationService.updateGroupMemberRole(
                currentIdentityUserId,
                conversationId,
                memberIdentityUserId,
                request
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Update group member role success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @PatchMapping("/{conversationId}/members/{memberIdentityUserId}/nickname")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> updateMemberNickname(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId,
            @PathVariable String memberIdentityUserId,
            @Valid @RequestBody UpdateMemberNicknameRequest request
    ) {
        Conversation conversation = conversationService.updateMemberNickname(
                currentIdentityUserId,
                conversationId,
                memberIdentityUserId,
                request
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Update member nickname success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @GetMapping("/{conversationId}/group-details")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> getGroupConversationDetails(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId
    ) {
        Conversation conversation = conversationService.getGroupConversationDetails(currentIdentityUserId, conversationId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Get group conversation details success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @PatchMapping("/{conversationId}/management-settings")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> updateGroupManagementSettings(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId,
            @Valid @RequestBody UpdateGroupManagementSettingsRequest request
    ) {
        Conversation conversation = conversationService.updateGroupManagementSettings(
                currentIdentityUserId,
                conversationId,
                request
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Update group management settings success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @PostMapping("/{conversationId}/member-requests/{requestId}/approve")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> approveGroupMemberRequest(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId,
            @PathVariable String requestId
    ) {
        Conversation conversation = conversationService.approveGroupMemberRequest(
                currentIdentityUserId,
                conversationId,
                requestId
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Approve group member request success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @DeleteMapping("/{conversationId}/member-requests/{requestId}")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> rejectGroupMemberRequest(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId,
            @PathVariable String requestId
    ) {
        Conversation conversation = conversationService.rejectGroupMemberRequest(
                currentIdentityUserId,
                conversationId,
                requestId
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Reject group member request success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @PatchMapping("/{conversationId}/transfer-admin")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> transferGroupAdmin(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId,
            @Valid @RequestBody TransferGroupAdminRequest request
    ) {
        Conversation conversation = conversationService.transferGroupAdmin(currentIdentityUserId, conversationId, request);
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Transfer group admin success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @PostMapping("/{conversationId}/leave")
    public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> leaveGroupConversation(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId
    ) {
        Conversation conversation = conversationService.leaveGroupConversation(currentIdentityUserId, conversationId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Leave group conversation success",
                        ManageGroupParticipantsResponse.from(conversation)
                )
        );
    }

    @DeleteMapping("/{conversationId}/dissolve")
    public ResponseEntity<ResponseSuccess<DissolveGroupConversationResponse>> dissolveGroupConversation(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable String conversationId
    ) {
        conversationService.dissolveGroupConversation(currentIdentityUserId, conversationId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(
                        HttpStatus.OK,
                        "Dissolve group conversation success",
                        DissolveGroupConversationResponse.builder()
                                .idConversation(conversationId)
                                .dissolved(true)
                                .dissolvedAt(LocalDateTime.now())
                                .build()
                )
        );
    }
}
