package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface MessageRepository extends MongoRepository<Message, String> {

    Page<Message> findByIdConversationOrderByTimeSentDesc(String idConversation, Pageable pageable);

    @Query("{ 'idConversation': ?0, $or: [ { 'hiddenForAccountIds': { $exists: false } }, { 'hiddenForAccountIds': null }, { 'hiddenForAccountIds': { $nin: [?1] } } ] }")
    Page<Message> findVisibleForParticipant(String idConversation, String identityUserId, Pageable pageable);

    @Query("{ 'idConversation': ?0, 'attachments': { $exists: true, $ne: [] } }")
    Page<Message> findByIdConversationWithAttachments(String idConversation, Pageable pageable);

    @Query("{ 'idConversation': ?0, $and: [ { $or: [ { 'hiddenForAccountIds': { $exists: false } }, { 'hiddenForAccountIds': null }, { 'hiddenForAccountIds': { $nin: [?1] } } ] }, { $or: [ { 'content': { $regex: ?2, $options: 'i' } }, { 'attachments.url': { $regex: ?2, $options: 'i' } }, { 'attachments.size': { $regex: ?2, $options: 'i' } } ] } ] }")
    Page<Message> searchVisibleForParticipant(String idConversation, String identityUserId, String keyword, Pageable pageable);

    @Query(value = "{ 'idConversation': ?0, 'idAccountSent': { $ne: ?1 }, $or: [ { 'hiddenForAccountIds': { $exists: false } }, { 'hiddenForAccountIds': null }, { 'hiddenForAccountIds': { $nin: [?1] } } ] }", count = true)
    long countIncomingVisibleForParticipant(String idConversation, String identityUserId);

    @Query(value = "{ 'idConversation': ?0, 'idAccountSent': { $ne: ?1 }, 'timeSent': { $gt: ?2 }, $or: [ { 'hiddenForAccountIds': { $exists: false } }, { 'hiddenForAccountIds': null }, { 'hiddenForAccountIds': { $nin: [?1] } } ] }", count = true)
    long countUnreadForParticipantSince(String idConversation, String identityUserId, LocalDateTime seenAt);

    long countByIdConversation(String idConversation);

    long countByIdConversationAndIdAccountSent(String idConversation, String idAccountSent);

    long countByIdConversationAndTimeSentGreaterThanEqual(String idConversation, LocalDateTime fromTime);

    long countByIdConversationAndIdAccountSentAndTimeSentGreaterThanEqual(
            String idConversation,
            String idAccountSent,
            LocalDateTime fromTime
    );

    Optional<Message> findTopByIdConversationOrderByTimeSentAsc(String idConversation);

    Optional<Message> findTopByIdConversationOrderByTimeSentDesc(String idConversation);
}
