package iuh.fit.saga_orchestrator_service.config;

import iuh.fit.saga_orchestrator_service.grpc.SignupSagaGrpcService;
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
            @Value("${grpc.server.port:9096}") int grpcPort,
            SignupSagaGrpcService signupSagaGrpcService
    ) throws IOException {
        return NettyServerBuilder.forPort(grpcPort)
                .addService(signupSagaGrpcService)
                .build();
    }
}
