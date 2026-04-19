package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.MessageReadStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MessageReadStatusRepository extends MongoRepository<MessageReadStatus, String> {

    Optional<MessageReadStatus> findByIdConversation(String idConversation);

    List<MessageReadStatus> findByIdConversationIn(List<String> conversationIds);
}
