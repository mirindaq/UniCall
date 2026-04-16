package iuh.fit.user_service.clients;

import com.google.protobuf.ByteString;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.unicall.grpc.file.v1.FileServiceGrpc;
import iuh.fit.unicall.grpc.file.v1.UploadAvatarRequest;
import iuh.fit.unicall.grpc.file.v1.UploadAvatarResponse;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
public class GrpcFileServiceClient {
    private final String host;
    private final int port;
    private final long deadlineMs;

    private ManagedChannel channel;
    private FileServiceGrpc.FileServiceBlockingStub fileStub;

    public GrpcFileServiceClient(
            @Value("${grpc.file-service.host:localhost}") String host,
            @Value("${grpc.file-service.port:9097}") int port,
            @Value("${grpc.file-service.deadline-ms:5000}") long deadlineMs
    ) {
        this.host = host;
        this.port = port;
        this.deadlineMs = deadlineMs;
    }

    @PostConstruct
    void init() {
        channel = ManagedChannelBuilder.forAddress(host, port)
                .usePlaintext()
                .build();
        fileStub = FileServiceGrpc.newBlockingStub(channel);
    }

    @PreDestroy
    void shutdown() {
        if (channel != null) {
            channel.shutdown();
        }
    }

    public String uploadAvatar(String identityUserId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidParamException("Avatar file is required");
        }

        String filename = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "avatar";
        String contentType = StringUtils.hasText(file.getContentType()) ? file.getContentType() : "application/octet-stream";

        try {
            UploadAvatarRequest request = UploadAvatarRequest.newBuilder()
                    .setOwnerIdentityUserId(identityUserId == null ? "" : identityUserId)
                    .setFileName(filename)
                    .setContentType(contentType)
                    .setContent(ByteString.copyFrom(file.getBytes()))
                    .build();

            UploadAvatarResponse response = fileStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .uploadAvatar(request);

            if (!StringUtils.hasText(response.getUrl())) {
                throw new RuntimeException("File service returned empty avatar url");
            }
            return response.getUrl();
        } catch (IOException ex) {
            throw new InvalidParamException("Unable to read avatar file");
        } catch (StatusRuntimeException ex) {
            if (ex.getStatus().getCode() == Status.Code.INVALID_ARGUMENT) {
                throw new InvalidParamException(ex.getStatus().getDescription());
            }
            throw new RuntimeException("Unable to upload avatar", ex);
        }
    }
}
