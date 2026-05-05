package iuh.fit.post_service.dtos.response;

import iuh.fit.post_service.enums.ReactionType;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class LikeResponse {
    private Boolean isLiked;
    private ReactionType userReaction; // Current user's reaction type
    private Long totalReactions;
    private Map<ReactionType, Long> reactionCounts; // Count for each reaction type
}
