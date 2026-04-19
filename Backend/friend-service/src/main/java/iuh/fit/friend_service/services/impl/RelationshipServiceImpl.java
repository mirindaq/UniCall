package iuh.fit.friend_service.services.impl;

import iuh.fit.friend_service.dtos.request.RelationshipRequest;
import iuh.fit.friend_service.dtos.response.RelationshipResponse;
import iuh.fit.friend_service.entities.Relationship;
import iuh.fit.friend_service.enums.RelationshipType;
import iuh.fit.friend_service.mapper.RelationshipMapper;
import iuh.fit.friend_service.repositories.RelationshipRepository;
import iuh.fit.friend_service.services.RelationshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.HashSet;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RelationshipServiceImpl implements RelationshipService {
    private final RelationshipRepository relationshipRepository;
    private final RelationshipMapper relationshipMapper;

    @Override
    public boolean createRelationship(RelationshipRequest relationshipRequest) {
        try {
            Relationship relationship = relationshipRepository.findOne(
                            byActorAndTarget(
                                    relationshipRequest.getActorId(),
                                    relationshipRequest.getTargetId()))
                    .orElseGet(() -> Relationship.builder()
                            .actorId(relationshipRequest.getActorId())
                            .targetId(relationshipRequest.getTargetId())
                            .build());

            if (relationshipRequest.getRelationshipType() != null) {
                relationship.getRelationshipTypes().addAll(relationshipRequest.getRelationshipType());
            }

            relationshipRepository.save(relationship);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public RelationshipResponse getRelationshipBetweenUsers(String userId1, String userId2) {
        Optional<Relationship> relationship = relationshipRepository.findOne(
                Specification.where(byActorAndTarget(userId1, userId2))
                       );
        return relationship.map(relationshipMapper::toRelationshipResponse).orElse(null);
    }

    @Override
    public List<RelationshipResponse> getRelationships(String type) {
        try {
            RelationshipType relationshipType = RelationshipType.valueOf(type.toUpperCase());
            List<Relationship> relationships = relationshipRepository.findAll(
                    (root, query, cb) -> cb.isMember(relationshipType, root.get("relationshipTypes")));
            return relationships.stream()
                    .map(relationshipMapper::toRelationshipResponse)
                    .toList();
        } catch (IllegalArgumentException e) {
            return List.of();
        }
    }

    @Override
    public boolean updateRelationship(RelationshipRequest relationshipRequest) {
        try {
            // Upsert by EXACT (actorId, targetId) direction (do NOT search both directions)
            Relationship relationship = relationshipRepository.findOne(
                            byActorAndTarget(
                                    relationshipRequest.getActorId(),
                                    relationshipRequest.getTargetId()))
                    .orElseGet(() -> Relationship.builder()
                            .actorId(relationshipRequest.getActorId())
                            .targetId(relationshipRequest.getTargetId())
                            .relationshipTypes(new HashSet<>())
                            .build());



            // Add relationship types (do not remove existing).
            if (relationshipRequest.getRelationshipType() != null) {
                relationship.getRelationshipTypes().addAll(relationshipRequest.getRelationshipType());
            }
            System.out.println("Relationship: " + relationship);
            relationshipRepository.save(relationship);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean deleteRelationship(String relationshipId) {
        try {
            relationshipRepository.deleteById(relationshipId);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Relationship findOrCreateRelationship(String actorId, String targetId) {
        return relationshipRepository.findOne(byActorAndTarget(actorId, targetId))
                .orElseGet(() -> Relationship.builder()
                        .actorId(actorId)
                        .targetId(targetId)
                        .build());
    }

    private Specification<Relationship> byActorAndTarget(String actorId, String targetId) {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("actorId"), actorId),
                cb.equal(root.get("targetId"), targetId));
    }
}
