package iuh.fit.chat_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import tools.jackson.databind.jsontype.PolymorphicTypeValidator;

import java.time.Duration;
import java.util.Map;

@Configuration
public class ChatCacheConfig implements CachingConfigurer {
    public static final String MESSAGE_SEARCH_CACHE_NAME = "chatMessageSearch";

    private final CacheErrorHandler cacheErrorHandler = new CacheErrorHandler() {
        @Override
        public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
        }

        @Override
        public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
        }

        @Override
        public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
        }

        @Override
        public void handleCacheClearError(RuntimeException exception, Cache cache) {
        }
    };

    @Bean
    public CacheManager cacheManager(
            RedisConnectionFactory redisConnectionFactory,
            @Value("${app.cache.message-search-ttl-seconds:3600}") long messageSearchTtlSeconds
    ) {
        Duration messageSearchTtl = Duration.ofSeconds(messageSearchTtlSeconds > 0 ? messageSearchTtlSeconds : 3600);
        RedisCacheConfiguration messageSearchCacheConfig = baseCacheConfig().entryTtl(messageSearchTtl);

        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(messageSearchCacheConfig)
                .withInitialCacheConfigurations(Map.of(MESSAGE_SEARCH_CACHE_NAME, messageSearchCacheConfig))
                .build();
    }

    @Bean
    public CacheErrorHandler cacheErrorHandler() {
        return cacheErrorHandler;
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return cacheErrorHandler;
    }

    private RedisCacheConfiguration baseCacheConfig() {
        return RedisCacheConfiguration.defaultCacheConfig()
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(StringRedisSerializer.UTF_8))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(redisJsonSerializer()));
    }

    private RedisSerializer<Object> redisJsonSerializer() {
        PolymorphicTypeValidator typeValidator = BasicPolymorphicTypeValidator.builder()
                .allowIfSubType("iuh.fit.")
                .allowIfSubType("java.")
                .build();

        return GenericJacksonJsonRedisSerializer.builder()
                .enableDefaultTyping(typeValidator)
                .build();
    }
}
