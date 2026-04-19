package iuh.fit.friend_service.dtos.request;

import iuh.fit.friend_service.enums.RelationshipType;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;

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
    Set<RelationshipType> relationshipType;
}
