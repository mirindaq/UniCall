package iuh.fit.post_service.dtos.request;

import iuh.fit.post_service.enums.PostPrivacy;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UpdatePostRequest {
    
    @Size(max = 10000, message = "Content cannot exceed 10000 characters")
    private String content;
    
    private List<String> mediaUrls;
    
    private PostPrivacy privacy;
}
