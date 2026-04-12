package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface MessageRepository extends MongoRepository<Message, String> {

    Page<Message> findByIdConversationOrderByTimeSentDesc(String idConversation, Pageable pageable);

    @Query("{ 'idConversation': ?0, $or: [ { 'hiddenForAccountIds': { $exists: false } }, { 'hiddenForAccountIds': null }, { 'hiddenForAccountIds': { $nin: [?1] } } ] }")
    Page<Message> findVisibleForParticipant(String idConversation, String identityUserId, Pageable pageable);

    @Query("{ 'idConversation': ?0, 'attachments': { $exists: true, $ne: [] } }")
    Page<Message> findByIdConversationWithAttachments(String idConversation, Pageable pageable);

    @Query("{ 'idConversation': ?0, $and: [ { $or: [ { 'hiddenForAccountIds': { $exists: false } }, { 'hiddenForAccountIds': null }, { 'hiddenForAccountIds': { $nin: [?1] } } ] }, { $or: [ { 'content': { $regex: ?2, $options: 'i' } }, { 'attachments.url': { $regex: ?2, $options: 'i' } }, { 'attachments.size': { $regex: ?2, $options: 'i' } } ] } ] }")
    Page<Message> searchVisibleForParticipant(String idConversation, String identityUserId, String keyword, Pageable pageable);
}
