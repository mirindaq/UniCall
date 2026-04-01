package iuh.fit.api_gateway.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Collection;

@Component
public class JwtHeaderInjectionFilter implements GlobalFilter, Ordered {
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String USER_ROLE_HEADER = "X-User-Role";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .flatMap(authentication -> chain.filter(
                        exchange.mutate().request(buildRequest(authentication, exchange.getRequest())).build()
                ))
                .switchIfEmpty(chain.filter(exchange));
    }

    private ServerHttpRequest buildRequest(Authentication authentication, ServerHttpRequest request) {
        return request.mutate().headers(headers -> {
            if (authentication instanceof JwtAuthenticationToken jwtToken && authentication.isAuthenticated()) {
                headers.remove(USER_ID_HEADER);
                headers.remove(USER_ROLE_HEADER);
                String userId = jwtToken.getToken().getSubject();
                String userRole = extractRole(jwtToken);
                if (userId != null && !userId.isBlank()) {
                    headers.set(USER_ID_HEADER, userId);
                }
                if (userRole != null && !userRole.isBlank()) {
                    headers.set(USER_ROLE_HEADER, userRole);
                }
            }
        }).build();
    }

    private String extractRole(JwtAuthenticationToken token) {
        Collection<String> roles = token.getToken().getClaimAsStringList("roles");
        if (roles != null && !roles.isEmpty()) {
            return roles.iterator().next();
        }

        var realmAccess = token.getToken().getClaimAsMap("realm_access");
        if (realmAccess != null) {
            Object rawRoles = realmAccess.get("roles");
            if (rawRoles instanceof Collection<?> collection && !collection.isEmpty()) {
                Object first = collection.iterator().next();
                return first == null ? "" : first.toString();
            }
        }

        return "";
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
