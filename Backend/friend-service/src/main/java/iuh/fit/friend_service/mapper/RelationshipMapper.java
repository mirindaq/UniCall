package iuh.fit.friend_service.mapper;

import iuh.fit.friend_service.dtos.request.RelationshipRequest;
import iuh.fit.friend_service.dtos.response.RelationshipResponse;
import iuh.fit.friend_service.entities.Relationship;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RelationshipMapper {
    Relationship toRelationship(RelationshipRequest relationshipRequest);
    RelationshipResponse toRelationshipResponse(Relationship relationship);
}
