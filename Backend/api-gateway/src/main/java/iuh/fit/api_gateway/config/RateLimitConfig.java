package iuh.fit.api_gateway.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RateLimiter;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.support.ConfigurationService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.security.Principal;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Configuration
public class RateLimitConfig {

    @Bean
    public KeyResolver userOrIpKeyResolver() {
        return exchange -> exchange.getPrincipal()
                .map(this::principalKey)
                .filter(StringUtils::hasText)
                .switchIfEmpty(Mono.fromSupplier(() -> clientIpKey(exchange)))
                .map(key -> key.toLowerCase(Locale.ROOT));
    }

    @Bean
    @Primary
    public RedisRateLimiter redisRateLimiter(
            ReactiveStringRedisTemplate redisTemplate,
            @Qualifier(RedisRateLimiter.REDIS_SCRIPT_NAME) RedisScript<List<Long>> redisScript,
            ConfigurationService configurationService
    ) {
        return new FailOpenRedisRateLimiter(redisTemplate, redisScript, configurationService);
    }

    private String principalKey(Principal principal) {
        if (principal instanceof Authentication authentication && StringUtils.hasText(authentication.getName())) {
            return "user:" + authentication.getName();
        }
        if (principal != null && StringUtils.hasText(principal.getName())) {
            return "user:" + principal.getName();
        }
        return null;
    }

    private String clientIpKey(ServerWebExchange exchange) {
        ServerHttpRequest request = exchange.getRequest();
        String forwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            String firstForwardedIp = forwardedFor.split(",")[0].trim();
            if (StringUtils.hasText(firstForwardedIp)) {
                return "ip:" + firstForwardedIp;
            }
        }

        InetSocketAddress remoteAddress = request.getRemoteAddress();
        if (remoteAddress != null && remoteAddress.getAddress() != null) {
            return "ip:" + remoteAddress.getAddress().getHostAddress();
        }
        return "ip:unknown";
    }

    private static class FailOpenRedisRateLimiter extends RedisRateLimiter {

        FailOpenRedisRateLimiter(
                ReactiveStringRedisTemplate redisTemplate,
                RedisScript<List<Long>> redisScript,
                ConfigurationService configurationService
        ) {
            super(redisTemplate, redisScript, configurationService);
        }

        @Override
        public Mono<RateLimiter.Response> isAllowed(String routeId, String id) {
            return super.isAllowed(routeId, id)
                    .onErrorReturn(new RateLimiter.Response(true, Map.of()));
        }
    }
}
