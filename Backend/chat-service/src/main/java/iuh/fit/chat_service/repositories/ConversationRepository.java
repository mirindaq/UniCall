package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {
}
