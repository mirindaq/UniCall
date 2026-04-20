package iuh.fit.post_service.clients;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.google.protobuf.ByteString;

import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import iuh.fit.unicall.grpc.file.v1.FileServiceGrpc;
import iuh.fit.unicall.grpc.file.v1.UploadFileRequest;
import iuh.fit.unicall.grpc.file.v1.UploadFileResponse;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;

@Slf4j
@Component
public class GrpcFileServiceClient {

    @GrpcClient("file-service")
    private FileServiceGrpc.FileServiceBlockingStub fileStub;

    private final long deadlineMs;

    public GrpcFileServiceClient(@Value("${grpc.file-service.deadline-ms:10000}") long deadlineMs) {
        this.deadlineMs = deadlineMs;
    }

    public Optional<FileUploadResult> uploadFile(String fileName, String contentType, byte[] content) {
        if (fileName == null || fileName.isBlank() || 
            contentType == null || contentType.isBlank() ||
            content == null || content.length == 0) {
            log.warn("Invalid upload file parameters");
            return Optional.empty();
        }

        UploadFileRequest request = UploadFileRequest.newBuilder()
                .setFileName(fileName)
                .setContentType(contentType)
                .setContent(ByteString.copyFrom(content))
                .build();

        try {
            UploadFileResponse response = fileStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .uploadFile(request);

            return Optional.of(new FileUploadResult(
                    response.getUrl(),
                    response.getFileSize()
            ));
        } catch (StatusRuntimeException ex) {
            if (ex.getStatus().getCode() == Status.Code.INVALID_ARGUMENT) {
                log.warn("Invalid file upload request: {}", ex.getMessage());
            } else {
                ex.printStackTrace();
                log.error("Cannot upload file via gRPC: {}", ex.getMessage());
            }
            return Optional.empty();
        }
    }

    public record FileUploadResult(
            String url,
            long fileSize
    ) {
    }
}
