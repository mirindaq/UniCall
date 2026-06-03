package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.config.ChatCacheConfig;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.enums.MessageEnum;
import iuh.fit.chat_service.enums.MessageType;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CachedMessageSearchServiceTest {

    @Test
    void searchVisibleMessagesCachesResultForSameSearchKey() {
        try (AnnotationConfigApplicationContext context = testContext()) {
            CachedMessageSearchService service = context.getBean(CachedMessageSearchService.class);
            MessageRepository messageRepository = context.getBean(MessageRepository.class);
            when(messageRepository.searchVisibleForParticipant(anyString(), anyString(), anyString(), any(Pageable.class)))
                    .thenReturn(pageOf(message("m1", "hello")));

            PageResponse<MessageResponse> first = service.searchVisibleMessages("conversation-1", "user-1", "hello", 1, 10);
            PageResponse<MessageResponse> second = service.searchVisibleMessages("conversation-1", "user-1", "hello", 1, 10);

            assertThat(first.getItems()).hasSize(1);
            assertThat(second.getItems()).hasSize(1);
            assertThat(second.getItems().getFirst().getIdMessage()).isEqualTo("m1");
            verify(messageRepository, times(1))
                    .searchVisibleForParticipant(anyString(), anyString(), anyString(), any(Pageable.class));
        }
    }

    @Test
    void searchVisibleMessagesKeepsCacheSeparatedByParticipant() {
        try (AnnotationConfigApplicationContext context = testContext()) {
            CachedMessageSearchService service = context.getBean(CachedMessageSearchService.class);
            MessageRepository messageRepository = context.getBean(MessageRepository.class);
            when(messageRepository.searchVisibleForParticipant(anyString(), anyString(), anyString(), any(Pageable.class)))
                    .thenReturn(pageOf(message("m1", "hello")));

            service.searchVisibleMessages("conversation-1", "user-1", "hello", 1, 10);
            service.searchVisibleMessages("conversation-1", "user-2", "hello", 1, 10);

            verify(messageRepository, times(2))
                    .searchVisibleForParticipant(anyString(), anyString(), anyString(), any(Pageable.class));
        }
    }

    @Test
    void evictAllClearsCachedSearchResults() {
        try (AnnotationConfigApplicationContext context = testContext()) {
            CachedMessageSearchService service = context.getBean(CachedMessageSearchService.class);
            MessageRepository messageRepository = context.getBean(MessageRepository.class);
            when(messageRepository.searchVisibleForParticipant(anyString(), anyString(), anyString(), any(Pageable.class)))
                    .thenReturn(pageOf(message("m1", "before-evict")))
                    .thenReturn(pageOf(message("m2", "after-evict")));

            service.searchVisibleMessages("conversation-1", "user-1", "hello", 1, 10);
            service.searchVisibleMessages("conversation-1", "user-1", "hello", 1, 10);
            service.evictAll();
            PageResponse<MessageResponse> afterEvict = service.searchVisibleMessages("conversation-1", "user-1", "hello", 1, 10);

            assertThat(afterEvict.getItems().getFirst().getIdMessage()).isEqualTo("m2");
            verify(messageRepository, times(2))
                    .searchVisibleForParticipant(anyString(), anyString(), anyString(), any(Pageable.class));
        }
    }

    @Test
    void searchVisibleMessagesEscapesKeywordAndUsesNewestFirstPageRequest() {
        try (AnnotationConfigApplicationContext context = testContext()) {
            CachedMessageSearchService service = context.getBean(CachedMessageSearchService.class);
            MessageRepository messageRepository = context.getBean(MessageRepository.class);
            when(messageRepository.searchVisibleForParticipant(eq("conversation-1"), eq("user-1"), eq(Pattern.quote("a+b?")), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(message("m1", "a+b?")), PageRequest.of(1, 2), 3));

            PageResponse<MessageResponse> result = service.searchVisibleMessages("conversation-1", "user-1", "a+b?", 2, 2);

            ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
            verify(messageRepository).searchVisibleForParticipant(
                    eq("conversation-1"),
                    eq("user-1"),
                    eq(Pattern.quote("a+b?")),
                    pageableCaptor.capture()
            );
            Pageable pageable = pageableCaptor.getValue();
            Sort.Order timeSentOrder = pageable.getSort().getOrderFor("timeSent");

            assertThat(result.getPage()).isEqualTo(2);
            assertThat(result.getLimit()).isEqualTo(2);
            assertThat(result.getTotalItem()).isEqualTo(3);
            assertThat(pageable.getPageNumber()).isEqualTo(1);
            assertThat(pageable.getPageSize()).isEqualTo(2);
            assertThat(timeSentOrder).isNotNull();
            assertThat(timeSentOrder.getDirection()).isEqualTo(Sort.Direction.DESC);
        }
    }

    private static AnnotationConfigApplicationContext testContext() {
        return new AnnotationConfigApplicationContext(TestCacheConfig.class);
    }

    private static PageImpl<Message> pageOf(Message message) {
        return new PageImpl<>(List.of(message), PageRequest.of(0, 10), 1);
    }

    private static Message message(String id, String content) {
        Message message = new Message();
        message.setIdMessage(id);
        message.setIdConversation("conversation-1");
        message.setIdAccountSent("user-1");
        message.setStatus(MessageEnum.SENT);
        message.setType(MessageType.TEXT);
        message.setContent(content);
        message.setTimeSent(LocalDateTime.parse("2026-06-03T09:00:00"));
        return message;
    }

    @Configuration
    @EnableCaching
    static class TestCacheConfig {
        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(ChatCacheConfig.MESSAGE_SEARCH_CACHE_NAME);
        }

        @Bean
        MessageRepository messageRepository() {
            return mock(MessageRepository.class);
        }

        @Bean
        CachedMessageSearchService cachedMessageSearchService(MessageRepository messageRepository) {
            return new CachedMessageSearchService(messageRepository);
        }
    }
}
