package iuh.fit.chat_service.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallMessage {
    private String type; // "offer", "answer", "ice-candidate", "reject", "end-call"
    private Long from;   // ID của người gửi
    private Long to;     // ID của người nhận
    private String sdp;  // SDP offer/answer nếu có
    private String candidate;
}
