package iuh.fit.api_gateway.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class AdminRouteGuardFilter implements GlobalFilter, Ordered {

  private static final String ADMIN_PREFIX = "/admin";
  private static final String USER_ROLE_HEADER = "X-User-Role";
  private static final String ROLE_ADMIN = "ADMIN";

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();
    if (!path.startsWith(ADMIN_PREFIX)) {
      return chain.filter(exchange);
    }

    String role = exchange.getRequest().getHeaders().getFirst(USER_ROLE_HEADER);
    if (ROLE_ADMIN.equals(role)) {
      return chain.filter(exchange);
    }

    exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
    return exchange.getResponse().setComplete();
  }

  @Override
  public int getOrder() {
    return Ordered.LOWEST_PRECEDENCE;
  }
}
