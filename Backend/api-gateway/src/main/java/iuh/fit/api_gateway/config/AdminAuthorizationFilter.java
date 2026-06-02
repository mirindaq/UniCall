package iuh.fit.api_gateway.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class AdminAuthorizationFilter implements GlobalFilter, Ordered {

  private static final String ADMIN_PATH_PREFIX = "/admin";
  private static final String USER_ROLE_HEADER = "X-User-Role";
  private static final String ADMIN_ROLE = "ADMIN";

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = exchange.getRequest().getPath().toString();
    if (!path.startsWith(ADMIN_PATH_PREFIX)) {
      return chain.filter(exchange);
    }

    ServerHttpRequest request = exchange.getRequest();
    String userRole = request.getHeaders().getFirst(USER_ROLE_HEADER);
    if (userRole == null || userRole.isBlank() || !ADMIN_ROLE.equalsIgnoreCase(userRole.trim())) {
      ServerHttpResponse response = exchange.getResponse();
      response.setStatusCode(HttpStatus.FORBIDDEN);
      response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
      DataBuffer buffer = response.bufferFactory()
          .wrap(("{\"error\":\"FORBIDDEN\",\"message\":\"Yeu cau quyen quan tri vien\"}").getBytes());
      return response.writeWith(Mono.just(buffer));
    }

    return chain.filter(exchange);
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE + 10;
  }
}
