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
}
