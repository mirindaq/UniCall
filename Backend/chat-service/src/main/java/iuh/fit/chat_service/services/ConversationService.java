package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.AddGroupMembersRequest;
import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.dtos.request.TransferGroupAdminRequest;
import iuh.fit.chat_service.dtos.request.UpdateGroupMemberRoleRequest;
import iuh.fit.chat_service.entities.Conversation;

public interface ConversationService {
    Conversation createGroupConversation(String currentIdentityUserId, CreateGroupConversationRequest request);
    Conversation addGroupMembers(
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
    Conversation getGroupConversationDetails(String currentIdentityUserId, String conversationId);
    Conversation transferGroupAdmin(
            String currentIdentityUserId,
            String conversationId,
            TransferGroupAdminRequest request
    );
    Conversation leaveGroupConversation(String currentIdentityUserId, String conversationId);
    void dissolveGroupConversation(String currentIdentityUserId, String conversationId);
}
