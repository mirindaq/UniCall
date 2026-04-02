package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends MongoRepository<Conversation, String> {

    @Query(value = "{ 'type': 'DOUBLE', 'participantInfos': { $size: 2 }, 'participantInfos.idAccount': { $all: ?0 } }")
    Optional<Conversation> findDirectConversationBetweenPair(List<String> sortedParticipantIds);

    @Query(value = "{ 'participantInfos.idAccount': ?0 }", sort = "{ 'dateUpdateMessage': -1 }")
    List<Conversation> findByParticipantAccount(String idAccount);
}
