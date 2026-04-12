package iuh.fit.identity_service.config;

import iuh.fit.identity_service.grpc.GrpcIdentityService;
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
            @Value("${grpc.server.port:9092}") int grpcPort,
            GrpcIdentityService grpcIdentityService
    ) throws IOException {
        return NettyServerBuilder.forPort(grpcPort)
                .addService(grpcIdentityService)
                .build();
    }
}
