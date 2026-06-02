package iuh.fit.chat_service.controllers;

import iuh.fit.chat_service.dtos.request.AddGroupMembersRequest;
import iuh.fit.chat_service.dtos.request.CreateSfuTokenRequest;
import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.dtos.request.TransferGroupAdminRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupAvatarRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupMemberRoleRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupManagementSettingsRequest;
import iuh.fit.chat_service.dtos.request.UpdateMemberNicknameRequest;
import iuh.fit.chat_service.dtos.response.CreateGroupConversationResponse;
import iuh.fit.chat_service.dtos.response.DissolveGroupConversationResponse;
import iuh.fit.chat_service.dtos.response.ManageGroupParticipantsResponse;
import iuh.fit.chat_service.dtos.response.SfuAccessTokenResponse;
import iuh.fit.chat_service.dtos.response.AdminGroupResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.enums.ParicipantRole;
import iuh.fit.chat_service.services.ConversationService;
import iuh.fit.chat_service.services.SfuTokenService;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.common_service.exceptions.UnauthorizedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("${api.prefix:/api/v1}/conversations")
@RequiredArgsConstructor
public class ConversationController {
  private static final String USER_ID_HEADER = "X-User-Id";
  private static final String USER_ROLE_HEADER = "X-User-Role";

  private final ConversationService conversationService;
  private final SfuTokenService sfuTokenService;

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

  @PatchMapping("/{conversationId}/avatar")
  public ResponseEntity<ResponseSuccess<ManageGroupParticipantsResponse>> updateGroupAvatar(
      @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
      @PathVariable String conversationId,
      @Valid @RequestBody UpdateGroupAvatarRequest request
  ) {
    Conversation conversation = conversationService.updateGroupAvatar(
        currentIdentityUserId,
        conversationId,
        request
    );
    return ResponseEntity.ok(
        new ResponseSuccess<>(
            HttpStatus.OK,
            "Update group avatar success",
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

  @PostMapping("/{conversationId}/calls/sfu-token")
  public ResponseEntity<ResponseSuccess<SfuAccessTokenResponse>> createSfuAccessToken(
      @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
      @PathVariable String conversationId,
      @RequestBody(required = false) CreateSfuTokenRequest request
  ) {
    String callId = request == null ? null : request.getCallId();
    SfuAccessTokenResponse response = sfuTokenService.createConversationCallToken(
        currentIdentityUserId,
        conversationId,
        callId
    );
    return ResponseEntity.ok(
        new ResponseSuccess<>(
            HttpStatus.OK,
            "Create SFU token success",
            response
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

  @GetMapping("/admin/groups")
  public ResponseEntity<ResponseSuccess<PageResponse<AdminGroupResponse>>> getAdminGroups(
      @RequestHeader(value = USER_ROLE_HEADER, required = false) String userRole,
      @RequestParam(name = "page", defaultValue = "1") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit
  ) {
    requireAdminRole(userRole);
    List<Conversation> groups = conversationService.getAllGroupsForAdmin();
    int start = Math.min((page - 1) * limit, groups.size());
    int end = Math.min(start + limit, groups.size());
    List<Conversation> pageItems = groups.subList(start, end);

    List<AdminGroupResponse> data = pageItems.stream()
        .map(c -> AdminGroupResponse.from(
            c.getIdConversation(),
            c.getName(),
            extractOwnerId(c),
            null,
            c.getNumberMember(),
            c.getType() != ConversationType.DOUBLE,
            c.getPendingMemberRequests() == null ? 0 : c.getPendingMemberRequests().size(),
            c.getDateCreate()
        ))
        .toList();

    PageResponse<AdminGroupResponse> response =
        new PageResponse<AdminGroupResponse>(page, limit, groups.size(), data);
    return ResponseEntity.ok(
        new ResponseSuccess<>(HttpStatus.OK, "Get admin groups success", response)
    );
  }

  private String extractOwnerId(Conversation c) {
    if (c.getParticipantInfos() == null) return null;
    return c.getParticipantInfos().stream()
        .filter(p -> p.getRole() == ParicipantRole.ADMIN)
        .findFirst()
        .map(ParticipantInfo::getIdAccount)
        .orElse(null);
  }

  private void requireAdminRole(String userRoleHeader) {
    if (userRoleHeader == null || userRoleHeader.isBlank()) {
      throw new UnauthorizedException("Missing admin role");
    }
    boolean hasAdminRole = Arrays.stream(userRoleHeader.split(","))
        .map(String::trim)
        .map(String::toLowerCase)
        .anyMatch(role -> role.equals("admin")
            || role.equals("role_admin")
            || role.equals("system_admin")
            || role.equals("super_admin")
            || role.equals("super-admin"));
    if (!hasAdminRole) {
      throw new UnauthorizedException("Admin role required");
    }
  }
}
