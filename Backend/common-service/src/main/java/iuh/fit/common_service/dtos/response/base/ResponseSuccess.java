package iuh.fit.common_service.dtos.response.base;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResponseSuccess<T> {
    private final int status;
    private final String message;
    private final T data;

    public ResponseSuccess(HttpStatus httpStatus, String message, T data) {
        this.status = httpStatus.value();
        this.message = message;
        this.data = data;
    }

    public ResponseSuccess(HttpStatus httpStatus, String message) {
        this.status = httpStatus.value();
        this.message = message;
        this.data = null;
    }
}