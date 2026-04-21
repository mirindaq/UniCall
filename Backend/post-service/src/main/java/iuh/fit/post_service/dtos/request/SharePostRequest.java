package iuh.fit.post_service.dtos.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SharePostRequest {
    
    @Size(max = 1000, message = "Message cannot exceed 1000 characters")
    private String message; // Optional message when sharing
}
