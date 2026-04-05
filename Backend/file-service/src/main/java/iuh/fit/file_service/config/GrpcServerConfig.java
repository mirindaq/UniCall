package iuh.fit.file_service.config;

import iuh.fit.file_service.grpc.GrpcFileService;
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
            @Value("${grpc.server.port:9097}") int grpcPort,
            GrpcFileService grpcFileService
    ) throws IOException {
        return NettyServerBuilder.forPort(grpcPort)
                .addService(grpcFileService)
                .build();
    }
}
