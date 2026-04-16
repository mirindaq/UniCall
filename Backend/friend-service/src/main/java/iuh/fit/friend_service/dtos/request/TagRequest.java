package iuh.fit.friend_service.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TagRequest {
    @NotNull
    String taggerId;
    @NotNull
    String taggedId;
    @NotNull
    String tagType;
}
