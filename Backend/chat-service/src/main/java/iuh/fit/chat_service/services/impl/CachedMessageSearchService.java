package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.config.ChatCacheConfig;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CachedMessageSearchService {
    private final MessageRepository messageRepository;

    @Cacheable(
            cacheNames = ChatCacheConfig.MESSAGE_SEARCH_CACHE_NAME,
            key = "#conversationId + ':' + #identityUserId + ':' + #keyword + ':' + #page + ':' + #limit"
    )
    public PageResponse<MessageResponse> searchVisibleMessages(
            String conversationId,
            String identityUserId,
            String keyword,
            int page,
            int limit
    ) {
        String regexKeyword = Pattern.quote(keyword);
        Page<Message> result = messageRepository.searchVisibleForParticipant(
                conversationId,
                identityUserId,
                regexKeyword,
                PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "timeSent"))
        );
        return PageResponse.fromPage(result, MessageResponse::from);
    }

    @CacheEvict(cacheNames = ChatCacheConfig.MESSAGE_SEARCH_CACHE_NAME, allEntries = true)
    public void evictAll() {
        // Message visibility/content changed, so cached search pages may be stale.
    }
}
