package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.AddGroupMembersRequest;
import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.dtos.request.TransferGroupAdminRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupMemberRoleRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupManagementSettingsRequest;
import iuh.fit.chat_service.dtos.request.UpdateMemberNicknameRequest;
import iuh.fit.chat_service.dtos.response.ManageGroupParticipantsResponse;
import iuh.fit.chat_service.entities.Conversation;

public interface ConversationService {
    Conversation createGroupConversation(String currentIdentityUserId, CreateGroupConversationRequest request);
    ManageGroupParticipantsResponse addGroupMembers(
            String currentIdentityUserId,
            String conversationId,
            AddGroupMembersRequest request
    );
    Conversation removeGroupMember(
            String currentIdentityUserId,
            String conversationId,
            String memberIdentityUserId
    );
    Conversation updateGroupMemberRole(
            String currentIdentityUserId,
            String conversationId,
            String memberIdentityUserId,
            UpdateGroupMemberRoleRequest request
    );
    Conversation updateMemberNickname(
            String currentIdentityUserId,
            String conversationId,
            String memberIdentityUserId,
            UpdateMemberNicknameRequest request
    );
    Conversation getGroupConversationDetails(String currentIdentityUserId, String conversationId);
    Conversation updateGroupManagementSettings(
            String currentIdentityUserId,
            String conversationId,
            UpdateGroupManagementSettingsRequest request
    );
    Conversation approveGroupMemberRequest(String currentIdentityUserId, String conversationId, String requestId);
    Conversation rejectGroupMemberRequest(String currentIdentityUserId, String conversationId, String requestId);
    Conversation transferGroupAdmin(
            String currentIdentityUserId,
            String conversationId,
            TransferGroupAdminRequest request
    );
    Conversation leaveGroupConversation(String currentIdentityUserId, String conversationId);
    void dissolveGroupConversation(String currentIdentityUserId, String conversationId);
}
