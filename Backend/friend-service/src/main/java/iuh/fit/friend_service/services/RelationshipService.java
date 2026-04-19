package iuh.fit.friend_service.services;

import iuh.fit.friend_service.dtos.request.RelationshipRequest;
import iuh.fit.friend_service.dtos.response.RelationshipResponse;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface RelationshipService {
    boolean createRelationship(RelationshipRequest relationshipRequest);
    RelationshipResponse getRelationshipBetweenUsers(String userId1, String userId2);
    List<RelationshipResponse> getRelationships(String type);
    boolean updateRelationship(RelationshipRequest relationshipRequest);
    boolean deleteRelationship(String relationshipId);
}
