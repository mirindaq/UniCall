package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.enums.ParicipantRole;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.services.ConversationService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

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
                participantInfos
        );

        return conversationRepository.save(conversation);
    }
}
