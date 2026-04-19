package iuh.fit.friend_service.entities;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tags")
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Tag {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String idTags;
    @NonNull // nguoi danh tag
    String taggerId;
    @NonNull // nguoi dc danh tag, nguoi nay ko thay
    String taggedId;
    @NonNull
    String tagType;
}
