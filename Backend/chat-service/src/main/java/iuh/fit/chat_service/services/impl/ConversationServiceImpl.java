package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.AddGroupMembersRequest;
import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.dtos.request.TransferGroupAdminRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupMemberRoleRequest;
import iuh.fit.chat_service.dtos.request.UpdateMemberNicknameRequest;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.enums.ParicipantRole;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.services.ConversationService;
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

@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {
    private final ConversationRepository conversationRepository;

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

        Conversation conversation = new Conversation(
                null,
                ConversationType.GROUP,
                groupName,
                "",
                now,
                now,
                "",
                participantInfos.size(),
                participantInfos,
                new ArrayList<>()
        );

        return conversationRepository.save(conversation);
    }

    @Override
    public Conversation addGroupMembers(
            String currentIdentityUserId,
            String conversationId,
            AddGroupMembersRequest request
    ) {
        String actorId = normalizeAuthenticatedUserId(currentIdentityUserId);
        Conversation conversation = getGroupConversationOrThrow(conversationId);
        assertAdminActor(conversation, actorId);

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
        Set<String> existingIdentityUserIds = participantInfos.stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());

        LocalDateTime now = LocalDateTime.now();
        int addedCount = 0;
        for (String memberId : normalizedMembers) {
            if (existingIdentityUserIds.contains(memberId)) {
                continue;
            }
            participantInfos.add(new ParticipantInfo(memberId, ParicipantRole.USER, "", now));
            existingIdentityUserIds.add(memberId);
            addedCount++;
        }

        if (addedCount == 0) {
            throw new InvalidParamException("All provided members already exist in group");
        }

        conversation.setParticipantInfos(participantInfos);
        conversation.setNumberMember(participantInfos.size());
        conversation.setDateUpdateMessage(now);
        return conversationRepository.save(conversation);
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
        assertAdminActor(conversation, actorId);

        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos() == null
                ? new ArrayList<>()
                : new ArrayList<>(conversation.getParticipantInfos());

        ParticipantInfo targetParticipant = findParticipant(participantInfos, targetId);
        if (targetParticipant == null) {
            throw new ResourceNotFoundException("Member does not exist in this group");
        }

        if (targetParticipant.getRole() == ParicipantRole.ADMIN && countAdmin(participantInfos) == 1) {
            throw new InvalidParamException("Group must have at least one admin");
        }

        participantInfos.removeIf(participant -> targetId.equals(participant.getIdAccount()));
        if (participantInfos.isEmpty()) {
            throw new InvalidParamException("Group must have at least one member");
        }

        LocalDateTime now = LocalDateTime.now();
        conversation.setParticipantInfos(participantInfos);
        conversation.setNumberMember(participantInfos.size());
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
        return conversation;
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
        conversation.setParticipantInfos(participantInfos);
        conversation.setNumberMember(participantInfos.size());
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

    private void assertAdminActor(Conversation conversation, String actorId) {
        ParticipantInfo actor = findParticipant(conversation.getParticipantInfos(), actorId);
        if (actor == null) {
            throw new InvalidParamException("Current user is not in this group");
        }
        if (actor.getRole() != ParicipantRole.ADMIN) {
            throw new InvalidParamException("Only group admin can perform this action");
        }
    }

    private void assertMemberActor(Conversation conversation, String actorId) {
        ParticipantInfo actor = findParticipant(conversation.getParticipantInfos(), actorId);
        if (actor == null) {
            throw new InvalidParamException("Current user is not in this group");
        }
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
