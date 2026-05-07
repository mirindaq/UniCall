package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.chat_service.services.ChatStatisticsService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.DateOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ChatStatisticsServiceImpl implements ChatStatisticsService {
    private static final String UNICALL_BOT_ID = "unicall-ai-bot";
    private static final String UNICALL_IMAGE_BOT_ID = "unicall-image-bot";

    private final ChatConversationService chatConversationService;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final MongoTemplate mongoTemplate;

    @Override
    public ConversationStats summarizeConversation(String conversationId, String requesterId) {
        return summarizeConversation(conversationId, requesterId, null);
    }

    @Override
    public ConversationStats summarizeConversation(String conversationId, String requesterId, Integer periodDays) {
        chatConversationService.requireParticipant(conversationId, requesterId);
        var conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new InvalidParamException("Khong tim thay hoi thoai"));
        LocalDateTime fromTime = resolveFromTime(periodDays);

        long totalMessages = fromTime == null
                ? messageRepository.countByIdConversation(conversationId)
                : messageRepository.countByIdConversationAndTimeSentGreaterThanEqual(conversationId, fromTime);
        long requesterSentMessages = fromTime == null
                ? messageRepository.countByIdConversationAndIdAccountSent(conversationId, requesterId)
                : messageRepository.countByIdConversationAndIdAccountSentAndTimeSentGreaterThanEqual(
                        conversationId,
                        requesterId,
                        fromTime
                );
        String counterpartAccountId = resolveCounterpartAccountId(conversation.getParticipantInfos(), requesterId);
        long counterpartSentMessages = counterpartAccountId == null
                ? 0L
                : (fromTime == null
                ? messageRepository.countByIdConversationAndIdAccountSent(conversationId, counterpartAccountId)
                : messageRepository.countByIdConversationAndIdAccountSentAndTimeSentGreaterThanEqual(
                        conversationId,
                        counterpartAccountId,
                        fromTime
                ));
        long aiSentMessages = countAiMessages(conversationId, fromTime);
        long activeDays = countDistinctDays(conversationId, fromTime);
        LocalDateTime firstMessageAt = (fromTime == null
                ? messageRepository.findTopByIdConversationOrderByTimeSentAsc(conversationId)
                : findFirstMessageInPeriod(conversationId, fromTime))
                .map(Message::getTimeSent)
                .orElse(null);
        LocalDateTime lastMessageAt = (fromTime == null
                ? messageRepository.findTopByIdConversationOrderByTimeSentDesc(conversationId)
                : findLastMessageInPeriod(conversationId, fromTime))
                .map(Message::getTimeSent)
                .orElse(null);
        boolean groupConversation = conversation.getType() == ConversationType.GROUP;
        TopSenderStat topSender = groupConversation ? findTopSender(conversationId, fromTime) : null;

        return new ConversationStats(
                totalMessages,
                requesterSentMessages,
                counterpartSentMessages,
                aiSentMessages,
                activeDays,
                firstMessageAt,
                lastMessageAt,
                groupConversation,
                periodDays,
                counterpartAccountId,
                topSender
        );
    }

    private long countAiMessages(String conversationId, LocalDateTime fromTime) {
        long textAi = fromTime == null
                ? messageRepository.countByIdConversationAndIdAccountSent(conversationId, UNICALL_BOT_ID)
                : messageRepository.countByIdConversationAndIdAccountSentAndTimeSentGreaterThanEqual(
                        conversationId,
                        UNICALL_BOT_ID,
                        fromTime
                );
        long imageAi = fromTime == null
                ? messageRepository.countByIdConversationAndIdAccountSent(conversationId, UNICALL_IMAGE_BOT_ID)
                : messageRepository.countByIdConversationAndIdAccountSentAndTimeSentGreaterThanEqual(
                        conversationId,
                        UNICALL_IMAGE_BOT_ID,
                        fromTime
                );
        return textAi + imageAi;
    }

    private long countDistinctDays(String conversationId, LocalDateTime fromTime) {
        try {
            Criteria timeCriteria = Criteria.where("timeSent").ne(null);
            if (fromTime != null) {
                timeCriteria = timeCriteria.gte(fromTime);
            }
            Criteria criteria = new Criteria().andOperator(
                    Criteria.where("idConversation").is(conversationId),
                    timeCriteria
            );
            Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(criteria),
                Aggregation.project()
                        .and(DateOperators.DateToString.dateOf("timeSent").toString("%Y-%m-%d")).as("day"),
                Aggregation.group("day"),
                    Aggregation.count().as("total")
            );

            AggregationResults<Map> result =
                    mongoTemplate.aggregate(aggregation, "messages", Map.class);
            List<Map> mapped = result.getMappedResults();
            if (mapped.isEmpty()) {
                return 0;
            }
            Object total = mapped.get(0).get("total");
            if (total instanceof Number number) {
                return number.longValue();
            }
            if (total instanceof String text && StringUtils.hasText(text)) {
                return Long.parseLong(text);
            }
            return 0;
        } catch (Exception ex) {
            Query query = new Query();
            Criteria timeCriteria = Criteria.where("timeSent").ne(null);
            if (fromTime != null) {
                timeCriteria = timeCriteria.gte(fromTime);
            }
            Criteria criteria = new Criteria().andOperator(
                    Criteria.where("idConversation").is(conversationId),
                    timeCriteria
            );
            query.addCriteria(criteria);
            query.fields().include("timeSent");
            List<Message> messages = mongoTemplate.find(query, Message.class, "messages");
            Set<java.time.LocalDate> distinctDays = new HashSet<>();
            for (Message message : messages) {
                if (message == null || message.getTimeSent() == null) {
                    continue;
                }
                distinctDays.add(message.getTimeSent().toLocalDate());
            }
            return distinctDays.size();
        }
    }

    private TopSenderStat findTopSender(String conversationId, LocalDateTime fromTime) {
        Criteria criteria = Criteria.where("idConversation").is(conversationId)
                .and("idAccountSent").ne(null).nin(UNICALL_BOT_ID, UNICALL_IMAGE_BOT_ID);
        if (fromTime != null) {
            criteria = criteria.and("timeSent").gte(fromTime);
        }
        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(criteria),
                Aggregation.group("idAccountSent").count().as("messageCount"),
                Aggregation.sort(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "messageCount")),
                Aggregation.limit(1)
        );

        AggregationResults<Document> result =
                mongoTemplate.aggregate(aggregation, "messages", Document.class);
        List<Document> mapped = result.getMappedResults();
        if (mapped.isEmpty()) {
            return null;
        }
        Document item = mapped.get(0);
        String accountId = item.getString("_id");
        Object count = item.get("messageCount");
        long messageCount = count instanceof Number number ? number.longValue() : 0L;
        if (!StringUtils.hasText(accountId) || messageCount <= 0) {
            return null;
        }
        return new TopSenderStat(accountId, messageCount);
    }

    private java.util.Optional<Message> findFirstMessageInPeriod(String conversationId, LocalDateTime fromTime) {
        org.springframework.data.mongodb.core.query.Query query =
                new org.springframework.data.mongodb.core.query.Query();
        query.addCriteria(Criteria.where("idConversation").is(conversationId).and("timeSent").gte(fromTime));
        query.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "timeSent"));
        query.limit(1);
        return java.util.Optional.ofNullable(mongoTemplate.findOne(query, Message.class));
    }

    private java.util.Optional<Message> findLastMessageInPeriod(String conversationId, LocalDateTime fromTime) {
        org.springframework.data.mongodb.core.query.Query query =
                new org.springframework.data.mongodb.core.query.Query();
        query.addCriteria(Criteria.where("idConversation").is(conversationId).and("timeSent").gte(fromTime));
        query.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "timeSent"));
        query.limit(1);
        return java.util.Optional.ofNullable(mongoTemplate.findOne(query, Message.class));
    }

    private LocalDateTime resolveFromTime(Integer periodDays) {
        if (periodDays == null) {
            return null;
        }
        if (periodDays <= 0) {
            throw new InvalidParamException("So ngay thong ke phai lon hon 0");
        }
        return LocalDateTime.now().minusDays(periodDays);
    }

    private String resolveCounterpartAccountId(List<iuh.fit.chat_service.entities.ParticipantInfo> participantInfos, String requesterId) {
        if (participantInfos == null || participantInfos.isEmpty()) {
            return null;
        }
        return participantInfos.stream()
                .map(iuh.fit.chat_service.entities.ParticipantInfo::getIdAccount)
                .filter(StringUtils::hasText)
                .filter(id -> !requesterId.equals(id))
                .filter(id -> !UNICALL_BOT_ID.equals(id) && !UNICALL_IMAGE_BOT_ID.equals(id))
                .findFirst()
                .orElse(null);
    }
}
