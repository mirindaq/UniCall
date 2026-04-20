package iuh.fit.post_service.dtos.request;

import iuh.fit.post_service.enums.ReactionType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReactRequest {
    
    @NotNull(message = "Reaction type is required")
    private ReactionType reactionType;
}
