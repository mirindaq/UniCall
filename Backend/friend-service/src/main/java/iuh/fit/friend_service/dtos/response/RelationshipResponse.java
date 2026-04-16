package iuh.fit.friend_service.dtos.response;

import iuh.fit.friend_service.enums.RelationshipType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RelationshipResponse {
    String actorId;
    String targetId;
    RelationshipType relationshipType;
}
