package iuh.fit.user_service.config;

import iuh.fit.user_service.grpc.UserRegistrationGrpcService;
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
            @Value("${grpc.server.port:9091}") int grpcPort,
            UserRegistrationGrpcService userRegistrationGrpcService
    ) throws IOException {
        return NettyServerBuilder.forPort(grpcPort)
                .addService(userRegistrationGrpcService)
                .build();
    }
}
