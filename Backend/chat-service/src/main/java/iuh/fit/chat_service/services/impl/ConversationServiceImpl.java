package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.AddGroupMembersRequest;
import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.dtos.request.SendChatMessageRequest;
import iuh.fit.chat_service.dtos.request.TransferGroupAdminRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupAvatarRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupMemberRoleRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupManagementSettingsRequest;
import iuh.fit.chat_service.dtos.request.UpdateMemberNicknameRequest;
import iuh.fit.chat_service.dtos.response.ConversationResponse;
import iuh.fit.chat_service.dtos.response.ManageGroupParticipantsResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.GroupManagementSettings;
import iuh.fit.chat_service.entities.GroupMemberJoinRequest;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.enums.ParicipantRole;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.services.ChatMessageService;
import iuh.fit.chat_service.services.ConversationService;
import iuh.fit.chat_service.services.RealtimeEventPublisher;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {
    private final ConversationRepository conversationRepository;
    private final ChatMessageService chatMessageService;
    private final RealtimeEventPublisher realtimeEventPublisher;

    @Override
    public Conversation createGroupConversation(String currentIdentityUserId, CreateGroupConversationRequest request) {
        if (currentIdentityUserId == null || currentIdentityUserId.isBlank()) {
            throw new UnauthenticatedException("Missing authenticated user header");
        }

        String groupName = request.getName() == null ? "" : request.getName().trim();
        if (groupName.isBlank()) {
            throw new InvalidParamException("Group name is required");
        }

        List<String> normalizedMembers = request.getMemberIdentityUserIds() == null
                ? List.of()
                : request.getMemberIdentityUserIds().stream()
                .map(identityUserId -> identityUserId == null ? "" : identityUserId.trim())
                .filter(identityUserId -> !identityUserId.isBlank())
                .toList();

        if (normalizedMembers.isEmpty()) {
            throw new InvalidParamException("At least one member is required");
        }

        LinkedHashSet<String> allMemberIdentityUserIds = new LinkedHashSet<>();
        allMemberIdentityUserIds.add(currentIdentityUserId);
        allMemberIdentityUserIds.addAll(normalizedMembers);

        if (allMemberIdentityUserIds.size() < 2) {
            throw new InvalidParamException("Group must have at least 2 members");
        }

        LocalDateTime now = LocalDateTime.now();
        List<ParticipantInfo> participantInfos = new ArrayList<>();
        for (String identityUserId : allMemberIdentityUserIds) {
            participantInfos.add(new ParticipantInfo(
                    identityUserId,
                    identityUserId.equals(currentIdentityUserId) ? ParicipantRole.ADMIN : ParicipantRole.USER,
                    "",
                    now
            ));
        }

        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.GROUP);
        conversation.setName(groupName);
        conversation.setAvatar("");
        conversation.setDateCreate(now);
        conversation.setDateUpdateMessage(now);
        conversation.setLastMessageContent("");
        conversation.setNumberMember(participantInfos.size());
        conversation.setParticipantInfos(participantInfos);
        conversation.setPinnedByAccountIds(new ArrayList<>());
        conversation.setGroupManagementSettings(GroupManagementSettings.defaults());
        conversation.setPendingMemberRequests(new ArrayList<>());

        return conversationRepository.save(conversation);
    }

    @Override
    public ManageGroupParticipantsResponse addGroupMembers(
            String currentIdentityUserId,
            String conversationId,
            AddGroupMembersRequest request
    ) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        Conversation conversation = getGroupConversationOrThrow(conversationId);
        GroupManagementSettings groupManagementSettings = ensureGroupManagementSettings(conversation);

        List<String> normalizedMembers = request.getMemberIdentityUserIds() == null
                ? List.of()
                : request.getMemberIdentityUserIds().stream()
                .map(memberId -> memberId == null ? "" : memberId.trim())
                .filter(memberId -> !memberId.isBlank())
                .filter(memberId -> !memberId.equals(actorId))
                .distinct()
                .toList();

        if (normalizedMembers.isEmpty()) {
            throw new InvalidParamException("At least one valid member is required");
        }

        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getParticipantInfos());
        ParticipantInfo actorParticipant = findParticipant(participantInfos, actorId);
        if (actorParticipant == null) {
            throw new InvalidParamException("Current user is not in this group");
        }
        Set<String> existingIdentityUserIds = participantInfos.stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<GroupMemberJoinRequest> pendingMemberRequests = normalizePendingMemberRequests(conversation);

        LocalDateTime now = LocalDateTime.now();
        int addedCount = 0;
        int createdPendingCount = 0;
        boolean memberApprovalEnabled = Boolean.TRUE.equals(groupManagementSettings.getMemberApprovalEnabled());
        boolean canAddDirectly = !memberApprovalEnabled || isAdminOrDeputy(actorParticipant);

        for (String memberId : normalizedMembers) {
            if (existingIdentityUserIds.contains(memberId)) {
                continue;
            }

            if (canAddDirectly) {
                participantInfos.add(new ParticipantInfo(memberId, ParicipantRole.USER, "", now));
                existingIdentityUserIds.add(memberId);
                addedCount++;
                continue;
            }

            boolean existedPending = pendingMemberRequests.stream()
                    .anyMatch(item -> memberId.equals(item.getTargetIdentityUserId()));
            if (existedPending) {
                continue;
            }

            pendingMemberRequests.add(new GroupMemberJoinRequest(
                    UUID.randomUUID().toString(),
                    actorId,
                    memberId,
                    now
            ));
            createdPendingCount++;
        }

        if (addedCount == 0 && createdPendingCount == 0) {
            if (memberApprovalEnabled && !canAddDirectly) {
                throw new InvalidParamException("All provided members already exist or are pending approval");
            }
            throw new InvalidParamException("All provided members already exist in group");
        }

        if (addedCount > 0 && !pendingMemberRequests.isEmpty()) {
            pendingMemberRequests.removeIf(item -> existingIdentityUserIds.contains(item.getTargetIdentityUserId()));
        }

        conversation.setParticipantInfos(participantInfos);
        conversation.setNumberMember(participantInfos.size());
        conversation.setPendingMemberRequests(pendingMemberRequests);
        conversation.setDateUpdateMessage(now);
        Conversation saved = conversationRepository.save(conversation);
        return ManageGroupParticipantsResponse.from(saved, addedCount, createdPendingCount);
    }

    @Override
    public Conversation removeGroupMember(
            String currentIdentityUserId,
            String conversationId,
            String memberIdentityUserId
    ) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        String targetId = normalizeIdentityUserId(memberIdentityUserId, "Member identity user id is required");
        if (actorId.equals(targetId)) {
            throw new InvalidParamException("Cannot remove yourself from this API. Please use leave group");
        }
        Conversation conversation = getGroupConversationOrThrow(conversationId);

        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getParticipantInfos());

        ParticipantInfo actorParticipant = findParticipant(participantInfos, actorId);
        if (actorParticipant == null) {
            throw new InvalidParamException("Current user is not in this group");
        }
        ParticipantInfo targetParticipant = findParticipant(participantInfos, targetId);
        if (targetParticipant == null) {
            throw new ResourceNotFoundException("Member does not exist in this group");
        }
        assertCanRemoveGroupMember(actorParticipant, targetParticipant);

        if (targetParticipant.getRole() == ParicipantRole.ADMIN && countAdmin(participantInfos) == 1) {
            throw new InvalidParamException("Group must have at least one admin");
        }

        participantInfos.removeIf(participant -> targetId.equals(participant.getIdAccount()));
        if (participantInfos.isEmpty()) {
            throw new InvalidParamException("Group must have at least one member");
        }

        LocalDateTime now = LocalDateTime.now();
        List<GroupMemberJoinRequest> pendingMemberRequests = normalizePendingMemberRequests(conversation);
        pendingMemberRequests.removeIf(request -> targetId.equals(request.getTargetIdentityUserId())
                || targetId.equals(request.getRequesterIdentityUserId()));
        conversation.setParticipantInfos(participantInfos);
        conversation.setNumberMember(participantInfos.size());
        conversation.setPendingMemberRequests(pendingMemberRequests);
        conversation.setDateUpdateMessage(now);
        return conversationRepository.save(conversation);
    }

    @Override
    public Conversation updateGroupMemberRole(
            String currentIdentityUserId,
            String conversationId,
            String memberIdentityUserId,
            UpdateGroupMemberRoleRequest request
    ) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        String targetId = normalizeIdentityUserId(memberIdentityUserId, "Member identity user id is required");
        if (request.getRole() == null) {
            throw new InvalidParamException("Role is required");
        }
        if (actorId.equals(targetId) && request.getRole() != ParicipantRole.ADMIN) {
            throw new InvalidParamException("Cannot downgrade your own role");
        }

        Conversation conversation = getGroupConversationOrThrow(conversationId);
        assertAdminActor(conversation, actorId);

        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getParticipantInfos());
        ParticipantInfo targetParticipant = findParticipant(participantInfos, targetId);
        if (targetParticipant == null) {
            throw new ResourceNotFoundException("Member does not exist in this group");
        }

        ParicipantRole newRole = request.getRole();
        ParicipantRole oldRole = targetParticipant.getRole();
        if (oldRole == ParicipantRole.ADMIN && newRole != ParicipantRole.ADMIN && countAdmin(participantInfos) == 1) {
            throw new InvalidParamException("Group must have at least one admin");
        }

        targetParticipant.setRole(newRole);
        conversation.setParticipantInfos(participantInfos);
        conversation.setNumberMember(participantInfos.size());
        conversation.setDateUpdateMessage(LocalDateTime.now());
        return conversationRepository.save(conversation);
    }

    @Override
    public Conversation updateMemberNickname(
            String currentIdentityUserId,
            String conversationId,
            String memberIdentityUserId,
            UpdateMemberNicknameRequest request
    ) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        String targetId = normalizeIdentityUserId(memberIdentityUserId, "Member identity user id is required");
        Conversation conversation = getConversationOrThrow(conversationId);
        assertMemberActor(conversation, actorId);

        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getParticipantInfos());
        ParticipantInfo targetParticipant = findParticipant(participantInfos, targetId);
        if (targetParticipant == null) {
            throw new ResourceNotFoundException("Member does not exist in this conversation");
        }

        String nickname = request == null || request.getNickname() == null ? "" : request.getNickname().trim();
        if (nickname.length() > 50) {
            throw new InvalidParamException("Nickname must be at most 50 characters");
        }

        targetParticipant.setNickname(nickname);
        conversation.setParticipantInfos(participantInfos);
        conversation.setDateUpdateMessage(LocalDateTime.now());
        return conversationRepository.save(conversation);
    }

    @Override
    public Conversation getGroupConversationDetails(String currentIdentityUserId, String conversationId) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        Conversation conversation = getGroupConversationOrThrow(conversationId);
        assertMemberActor(conversation, actorId);
        ensureGroupManagementSettings(conversation);
        normalizePendingMemberRequests(conversation);
        return conversation;
    }

    @Override
    public Conversation updateGroupManagementSettings(
            String currentIdentityUserId,
            String conversationId,
            UpdateGroupManagementSettingsRequest request
    ) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        Conversation conversation = getGroupConversationOrThrow(conversationId);
        assertAdminOrDeputyActor(conversation, actorId);
        GroupManagementSettings previousSettings = copyGroupManagementSettings(ensureGroupManagementSettings(conversation));

        GroupManagementSettings settings = new GroupManagementSettings(
                request.getAllowMemberSendMessage(),
                request.getAllowMemberPinMessage(),
                request.getAllowMemberChangeAvatar(),
                request.getMemberApprovalEnabled()
        );

        conversation.setGroupManagementSettings(settings);
        conversation.setDateUpdateMessage(LocalDateTime.now());
        Conversation savedConversation = conversationRepository.save(conversation);

        publishConversationRealtime(savedConversation);
        publishGroupManagementSettingChangedMessages(
                actorId,
                savedConversation.getIdConversation(),
                previousSettings,
                settings
        );

        return savedConversation;
    }

    @Override
    public Conversation updateGroupAvatar(
            String currentIdentityUserId,
            String conversationId,
            UpdateGroupAvatarRequest request
    ) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        Conversation conversation = getGroupConversationOrThrow(conversationId);
        assertMemberActor(conversation, actorId);

        ParticipantInfo actorParticipant = findParticipant(conversation.getParticipantInfos(), actorId);
        GroupManagementSettings settings = ensureGroupManagementSettings(conversation);
        boolean isManager = isAdminOrDeputy(actorParticipant);
        boolean memberCanChangeAvatar = Boolean.TRUE.equals(settings.getAllowMemberChangeAvatar());
        if (!isManager && !memberCanChangeAvatar) {
            throw new InvalidParamException("Only group admin or deputy can change group avatar");
        }

        String nextAvatar = request.getAvatar() == null ? "" : request.getAvatar().trim();
        if (nextAvatar.isBlank()) {
            throw new InvalidParamException("Group avatar is required");
        }

        String currentAvatar = conversation.getAvatar() == null ? "" : conversation.getAvatar().trim();
        if (currentAvatar.equals(nextAvatar)) {
            return conversation;
        }

        conversation.setAvatar(nextAvatar);
        conversation.setDateUpdateMessage(LocalDateTime.now());
        Conversation savedConversation = conversationRepository.save(conversation);

        publishConversationRealtime(savedConversation);
        sendGroupSystemNotification(actorId, savedConversation.getIdConversation(), "Đã thay đổi ảnh đại diện nhóm.");

        return savedConversation;
    }

    @Override
    public Conversation approveGroupMemberRequest(String currentIdentityUserId, String conversationId, String requestId) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        String normalizedRequestId = normalizeIdentityUserId(requestId, "Request id is required");
        Conversation conversation = getGroupConversationOrThrow(conversationId);
        assertAdminOrDeputyActor(conversation, actorId);

        List<GroupMemberJoinRequest> pendingMemberRequests = normalizePendingMemberRequests(conversation);
        GroupMemberJoinRequest targetRequest = pendingMemberRequests.stream()
                .filter(item -> normalizedRequestId.equals(item.getIdRequest()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Pending member request not found"));

        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getParticipantInfos());

        String targetIdentityUserId = targetRequest.getTargetIdentityUserId();
        ParticipantInfo existedParticipant = findParticipant(participantInfos, targetIdentityUserId);
        if (existedParticipant == null) {
            participantInfos.add(new ParticipantInfo(
                    targetIdentityUserId,
                    ParicipantRole.USER,
                    "",
                    LocalDateTime.now()
            ));
        }

        pendingMemberRequests.removeIf(item -> normalizedRequestId.equals(item.getIdRequest())
                || targetIdentityUserId.equals(item.getTargetIdentityUserId()));

        conversation.setParticipantInfos(participantInfos);
        conversation.setNumberMember(participantInfos.size());
        conversation.setPendingMemberRequests(pendingMemberRequests);
        conversation.setDateUpdateMessage(LocalDateTime.now());
        return conversationRepository.save(conversation);
    }

    @Override
    public Conversation rejectGroupMemberRequest(String currentIdentityUserId, String conversationId, String requestId) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        String normalizedRequestId = normalizeIdentityUserId(requestId, "Request id is required");
        Conversation conversation = getGroupConversationOrThrow(conversationId);
        assertAdminOrDeputyActor(conversation, actorId);

        List<GroupMemberJoinRequest> pendingMemberRequests = normalizePendingMemberRequests(conversation);
        boolean removed = pendingMemberRequests.removeIf(item -> normalizedRequestId.equals(item.getIdRequest()));
        if (!removed) {
            throw new ResourceNotFoundException("Pending member request not found");
        }

        conversation.setPendingMemberRequests(pendingMemberRequests);
        conversation.setDateUpdateMessage(LocalDateTime.now());
        return conversationRepository.save(conversation);
    }

    @Override
    public Conversation transferGroupAdmin(
            String currentIdentityUserId,
            String conversationId,
            TransferGroupAdminRequest request
    ) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        String targetId = normalizeIdentityUserId(
                request.getTargetIdentityUserId(),
                "Target identity user id is required"
        );
        if (actorId.equals(targetId)) {
            throw new InvalidParamException("Cannot transfer admin role to yourself");
        }

        Conversation conversation = getGroupConversationOrThrow(conversationId);
        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getParticipantInfos());

        ParticipantInfo actorParticipant = findParticipant(participantInfos, actorId);
        if (actorParticipant == null || actorParticipant.getRole() != ParicipantRole.ADMIN) {
            throw new InvalidParamException("Only group admin can transfer admin role");
        }

        ParticipantInfo targetParticipant = findParticipant(participantInfos, targetId);
        if (targetParticipant == null) {
            throw new ResourceNotFoundException("Target member does not exist in this group");
        }
        if (targetParticipant.getRole() == ParicipantRole.ADMIN) {
            throw new InvalidParamException("Target member is already admin");
        }

        actorParticipant.setRole(ParicipantRole.DEPUTY);
        targetParticipant.setRole(ParicipantRole.ADMIN);
        conversation.setParticipantInfos(participantInfos);
        conversation.setDateUpdateMessage(LocalDateTime.now());
        return conversationRepository.save(conversation);
    }

    @Override
    public Conversation leaveGroupConversation(String currentIdentityUserId, String conversationId) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        Conversation conversation = getGroupConversationOrThrow(conversationId);

        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getParticipantInfos());

        ParticipantInfo actorParticipant = findParticipant(participantInfos, actorId);
        if (actorParticipant == null) {
            throw new InvalidParamException("Current user is not in this group");
        }
        if (participantInfos.size() == 1) {
            throw new InvalidParamException("Last member cannot leave group. Please dissolve group instead");
        }
        if (actorParticipant.getRole() == ParicipantRole.ADMIN && countAdmin(participantInfos) == 1) {
            throw new InvalidParamException("Admin must transfer role before leaving group");
        }

        participantInfos.removeIf(participant -> actorId.equals(participant.getIdAccount()));
        List<GroupMemberJoinRequest> pendingMemberRequests = normalizePendingMemberRequests(conversation);
        pendingMemberRequests.removeIf(request -> actorId.equals(request.getTargetIdentityUserId())
                || actorId.equals(request.getRequesterIdentityUserId()));
        conversation.setParticipantInfos(participantInfos);
        conversation.setNumberMember(participantInfos.size());
        conversation.setPendingMemberRequests(pendingMemberRequests);
        conversation.setDateUpdateMessage(LocalDateTime.now());
        return conversationRepository.save(conversation);
    }

    @Override
    public void dissolveGroupConversation(String currentIdentityUserId, String conversationId) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        Conversation conversation = getGroupConversationOrThrow(conversationId);
        assertAdminActor(conversation, actorId);
        conversationRepository.deleteById(conversation.getIdConversation());
    }

    private Conversation getGroupConversationOrThrow(String conversationId) {
        Conversation conversation = getConversationOrThrow(conversationId);
        if (conversation.getType() != ConversationType.GROUP) {
            throw new InvalidParamException("Only group conversation is supported");
        }
        return conversation;
    }

    private Conversation getConversationOrThrow(String conversationId) {
        String normalizedConversationId = normalizeIdentityUserId(conversationId, "Conversation id is required");
        return conversationRepository.findById(normalizedConversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
    }

    private String normalizeIdentityUserId(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new InvalidParamException(message);
        }
        return value.trim();
    }

    private String normalizeAuthenticatedUserId(String value) {
        if (value == null || value.isBlank()) {
            throw new UnauthenticatedException("Missing authenticated user header");
        }
        return value.trim();
    }

    private GroupManagementSettings ensureGroupManagementSettings(Conversation conversation) {
        GroupManagementSettings settings = conversation.getGroupManagementSettings();
        if (settings == null) {
            settings = GroupManagementSettings.defaults();
            conversation.setGroupManagementSettings(settings);
            return settings;
        }

        if (settings.getAllowMemberSendMessage() == null) {
            settings.setAllowMemberSendMessage(true);
        }
        if (settings.getAllowMemberPinMessage() == null) {
            settings.setAllowMemberPinMessage(true);
        }
        if (settings.getAllowMemberChangeAvatar() == null) {
            settings.setAllowMemberChangeAvatar(true);
        }
        if (settings.getMemberApprovalEnabled() == null) {
            settings.setMemberApprovalEnabled(false);
        }

        conversation.setGroupManagementSettings(settings);
        return settings;
    }

    private List<GroupMemberJoinRequest> normalizePendingMemberRequests(Conversation conversation) {
        List<GroupMemberJoinRequest> pendingMemberRequests = conversation.getPendingMemberRequests() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getPendingMemberRequests());

        pendingMemberRequests.removeIf(item -> item == null
                || item.getIdRequest() == null || item.getIdRequest().isBlank()
                || item.getRequesterIdentityUserId() == null || item.getRequesterIdentityUserId().isBlank()
                || item.getTargetIdentityUserId() == null || item.getTargetIdentityUserId().isBlank());

        conversation.setPendingMemberRequests(pendingMemberRequests);
        return pendingMemberRequests;
    }

    private boolean isAdminOrDeputy(ParticipantInfo participantInfo) {
        if (participantInfo == null || participantInfo.getRole() == null) {
            return false;
        }
        return participantInfo.getRole() == ParicipantRole.ADMIN || participantInfo.getRole() == ParicipantRole.DEPUTY;
    }

    private void assertAdminActor(Conversation conversation, String actorId) {
        ParticipantInfo actor = findParticipant(conversation.getParticipantInfos(), actorId);
        if (actor == null) {
            throw new InvalidParamException("Current user is not in this group");
        }
        if (actor.getRole() != ParicipantRole.ADMIN) {
            throw new InvalidParamException("Only group admin can perform this action");
        }
    }

    private void assertAdminOrDeputyActor(Conversation conversation, String actorId) {
        ParticipantInfo actor = findParticipant(conversation.getParticipantInfos(), actorId);
        if (actor == null) {
            throw new InvalidParamException("Current user is not in this group");
        }
        if (!isAdminOrDeputy(actor)) {
            throw new InvalidParamException("Only group admin or deputy can perform this action");
        }
    }

    private void assertMemberActor(Conversation conversation, String actorId) {
        ParticipantInfo actor = findParticipant(conversation.getParticipantInfos(), actorId);
        if (actor == null) {
            throw new InvalidParamException("Current user is not in this group");
        }
    }

    private void assertCanRemoveGroupMember(ParticipantInfo actor, ParticipantInfo target) {
        ParicipantRole actorRole = actor.getRole() == null ? ParicipantRole.USER : actor.getRole();
        ParicipantRole targetRole = target.getRole() == null ? ParicipantRole.USER : target.getRole();

        if (actorRole == ParicipantRole.ADMIN) {
            return;
        }
        if (actorRole == ParicipantRole.DEPUTY && targetRole == ParicipantRole.USER) {
            return;
        }

        if (actorRole == ParicipantRole.DEPUTY) {
            throw new InvalidParamException("Deputy can only remove regular members");
        }
        throw new InvalidParamException("Only group admin or deputy can remove members");
    }

    private GroupManagementSettings copyGroupManagementSettings(GroupManagementSettings source) {
        GroupManagementSettings safe = source == null ? GroupManagementSettings.defaults() : source;
        return new GroupManagementSettings(
                Boolean.TRUE.equals(safe.getAllowMemberSendMessage()),
                Boolean.TRUE.equals(safe.getAllowMemberPinMessage()),
                Boolean.TRUE.equals(safe.getAllowMemberChangeAvatar()),
                Boolean.TRUE.equals(safe.getMemberApprovalEnabled())
        );
    }

    private void publishConversationRealtime(Conversation conversation) {
        if (conversation == null || conversation.getParticipantInfos() == null) {
            return;
        }

        ConversationResponse payload = ConversationResponse.from(conversation);
        conversation.getParticipantInfos().stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .forEach(userId -> realtimeEventPublisher.publishUserConversationEvent(
                        userId,
                        conversation.getIdConversation(),
                        payload
                ));
    }

    private void sendGroupSystemNotification(String actorId, String conversationId, String content) {
        if (content == null || content.isBlank()) {
            return;
        }

        SendChatMessageRequest request = new SendChatMessageRequest();
        request.setContent(content.trim());
        try {
            chatMessageService.sendRest(actorId, conversationId, request);
        } catch (RuntimeException ignored) {
            // Do not block the main management action if notification message cannot be created.
        }
    }

    private void publishGroupManagementSettingChangedMessages(
            String actorId,
            String conversationId,
            GroupManagementSettings previousSettings,
            GroupManagementSettings currentSettings
    ) {
        List<String> messages = buildGroupManagementChangeMessages(previousSettings, currentSettings);
        messages.forEach(content -> sendGroupSystemNotification(actorId, conversationId, content));
    }

    private List<String> buildGroupManagementChangeMessages(
            GroupManagementSettings previousSettings,
            GroupManagementSettings currentSettings
    ) {
        List<String> messages = new ArrayList<>();
        if (previousSettings == null || currentSettings == null) {
            return messages;
        }

        if (!Objects.equals(previousSettings.getAllowMemberSendMessage(), currentSettings.getAllowMemberSendMessage())) {
            messages.add(Boolean.TRUE.equals(currentSettings.getAllowMemberSendMessage())
                    ? "Đã cho phép tất cả thành viên gửi tin nhắn vào nhóm."
                    : "Đã giới hạn gửi tin nhắn: chỉ trưởng/phó nhóm được gửi.");
        }

        if (!Objects.equals(previousSettings.getAllowMemberPinMessage(), currentSettings.getAllowMemberPinMessage())) {
            messages.add(Boolean.TRUE.equals(currentSettings.getAllowMemberPinMessage())
                    ? "Đã cho phép tất cả thành viên ghim tin nhắn."
                    : "Đã giới hạn ghim tin nhắn: chỉ trưởng/phó nhóm được ghim.");
        }

        if (!Objects.equals(previousSettings.getAllowMemberChangeAvatar(), currentSettings.getAllowMemberChangeAvatar())) {
            messages.add(Boolean.TRUE.equals(currentSettings.getAllowMemberChangeAvatar())
                    ? "Đã cho phép tất cả thành viên thay đổi ảnh đại diện nhóm."
                    : "Đã giới hạn thay đổi ảnh đại diện: chỉ trưởng/phó nhóm được đổi.");
        }

        if (!Objects.equals(previousSettings.getMemberApprovalEnabled(), currentSettings.getMemberApprovalEnabled())) {
            messages.add(Boolean.TRUE.equals(currentSettings.getMemberApprovalEnabled())
                    ? "Đã bật chế độ phê duyệt thành viên mới."
                    : "Đã tắt chế độ phê duyệt thành viên mới.");
        }

        return messages;
    }

    private ParticipantInfo findParticipant(List<ParticipantInfo> participantInfos, String identityUserId) {
        if (participantInfos == null || participantInfos.isEmpty()) {
            return null;
        }
        return participantInfos.stream()
                .filter(participant -> identityUserId.equals(participant.getIdAccount()))
                .findFirst()
                .orElse(null);
    }

    private long countAdmin(List<ParticipantInfo> participantInfos) {
        if (participantInfos == null || participantInfos.isEmpty()) {
            return 0;
        }
        return participantInfos.stream()
                .filter(participant -> participant.getRole() == ParicipantRole.ADMIN)
                .count();
    }
}
