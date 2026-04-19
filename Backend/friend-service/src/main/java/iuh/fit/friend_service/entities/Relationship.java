package iuh.fit.friend_service.entities;

import iuh.fit.friend_service.enums.RelationshipType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.HashSet;
import java.util.Set;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "relationships")
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Relationship {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String idRelationship;
    @NonNull
    String actorId;
    @NonNull
    String targetId;
    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    Set<RelationshipType> relationshipTypes = new HashSet<>();
}
