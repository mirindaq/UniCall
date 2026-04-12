package iuh.fit.user_service.schedulers;

import iuh.fit.user_service.services.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccountDeletionPurgeScheduler {
    private static final long DELETION_GRACE_DAYS = 30L;

    @Scheduled(cron = "0 0 2 * * *")
    public void purgeExpiredAccountDeletionRequests() {
        long deletedCount = userProfileService.purgeExpiredDeletionRequests(DELETION_GRACE_DAYS);
        if (deletedCount > 0) {
            log.info("Purged {} account(s) pending deletion for >= {} days", deletedCount, DELETION_GRACE_DAYS);
        }
    }

    private final UserProfileService userProfileService;
}
