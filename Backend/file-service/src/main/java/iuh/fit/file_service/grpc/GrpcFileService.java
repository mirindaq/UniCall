package iuh.fit.file_service.grpc;

import iuh.fit.common_service.exceptions.InvalidFileTypeException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.file_service.dtos.response.FileUploadResponse;
import iuh.fit.file_service.services.FileStorageService;
import iuh.fit.unicall.grpc.file.v1.FileServiceGrpc;
import iuh.fit.unicall.grpc.file.v1.UploadAvatarRequest;
import iuh.fit.unicall.grpc.file.v1.UploadAvatarResponse;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GrpcFileService extends FileServiceGrpc.FileServiceImplBase {
    private final FileStorageService fileStorageService;

    @Override
    public void uploadAvatar(
            UploadAvatarRequest request,
            StreamObserver<UploadAvatarResponse> responseObserver
    ) {
        try {
            FileUploadResponse result = fileStorageService.uploadBytes(
                    request.getFileName(),
                    request.getContentType(),
                    request.getContent().toByteArray()
            );

            responseObserver.onNext(UploadAvatarResponse.newBuilder()
                    .setUrl(result.getUrl())
                    .build());
            responseObserver.onCompleted();
        } catch (InvalidParamException | InvalidFileTypeException ex) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription(ex.getMessage()).asRuntimeException());
        } catch (Exception ex) {
            responseObserver.onError(Status.INTERNAL.withDescription("Unable to upload avatar").asRuntimeException());
        }
    }
}
