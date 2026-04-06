package iuh.fit.friend_service.dtos.request;

import iuh.fit.friend_service.enums.RelationshipType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RelationshipRequest {
    @NotNull
    String actorId;
    @NotNull
    String targetId;
    @NotNull
    RelationshipType relationshipType;
}
