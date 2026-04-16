package iuh.fit.user_service.dtos.response;

import iuh.fit.user_service.entities.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AccountDeletionStatusResponse {
    private Boolean deletionPending;
    private LocalDateTime deletionRequestedAt;
    private Long pendingDays;
    private Long remainingDays;
    private String deletionReason;

    public static AccountDeletionStatusResponse from(User user, long totalGraceDays) {
        LocalDateTime requestedAt = user.getDeletionRequestedAt();
        long pendingDays = 0;
        long remainingDays = totalGraceDays;

        if (Boolean.TRUE.equals(user.getDeletionPending()) && requestedAt != null) {
            long calculatedPending = java.time.Duration.between(requestedAt, LocalDateTime.now()).toDays();
            pendingDays = Math.max(calculatedPending, 0);
            remainingDays = Math.max(totalGraceDays - pendingDays, 0);
        }

        return AccountDeletionStatusResponse.builder()
                .deletionPending(Boolean.TRUE.equals(user.getDeletionPending()))
                .deletionRequestedAt(requestedAt)
                .pendingDays(pendingDays)
                .remainingDays(remainingDays)
                .deletionReason(user.getDeletionReason())
                .build();
    }
}
