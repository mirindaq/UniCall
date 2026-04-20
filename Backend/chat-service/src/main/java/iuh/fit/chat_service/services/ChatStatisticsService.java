package iuh.fit.chat_service.services;

import java.time.LocalDateTime;

public interface ChatStatisticsService {

    ConversationStats summarizeConversation(String conversationId, String requesterId);

    ConversationStats summarizeConversation(String conversationId, String requesterId, Integer periodDays);

    record ConversationStats(
            long totalMessages,
            long requesterSentMessages,
            long counterpartSentMessages,
            long aiSentMessages,
            long activeDays,
            LocalDateTime firstMessageAt,
            LocalDateTime lastMessageAt,
            boolean groupConversation,
            Integer periodDays,
            String counterpartAccountId,
            TopSenderStat topSender
    ) {
    }

    record TopSenderStat(
            String accountId,
            long messageCount
    ) {
    }
}
