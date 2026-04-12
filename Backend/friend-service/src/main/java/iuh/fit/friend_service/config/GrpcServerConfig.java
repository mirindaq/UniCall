package iuh.fit.friend_service.config;

import iuh.fit.friend_service.grpc.GrpcFriendService;
import io.grpc.Server;
import io.grpc.netty.shaded.io.grpc.netty.NettyServerBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class GrpcServerConfig {

    @Bean(initMethod = "start", destroyMethod = "shutdown")
    public Server grpcServer(
            @Value("${grpc.server.port:9098}") int grpcPort,
            GrpcFriendService grpcFriendService
    ) throws IOException {
        return NettyServerBuilder.forPort(grpcPort)
                .addService(grpcFriendService)
                .build();
    }
}
