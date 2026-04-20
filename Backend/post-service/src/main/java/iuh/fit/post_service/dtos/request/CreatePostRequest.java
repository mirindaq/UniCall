package iuh.fit.post_service.dtos.request;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import iuh.fit.post_service.enums.PostPrivacy;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreatePostRequest {
    
    @Size(max = 10000, message = "Content cannot exceed 10000 characters")
    private String content;
    
    private List<MultipartFile> files;
    
    @NotNull(message = "Privacy is required")
    private PostPrivacy privacy;
}
