package iuh.fit.common_service.exceptions;

import iuh.fit.common_service.dtos.response.base.ResponseError;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Date;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ResponseError> handleGeneralException(
                        Exception e,
                        HttpServletRequest request) {
                System.out.println("Exception: " + e.getClass().getName() + " - " + e.getMessage());
                return buildErrorResponse(
                                INTERNAL_SERVER_ERROR,
                                "Đã xảy ra lỗi nội bộ, vui lòng thử lại sau",
                                request);
        }

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ResponseError> handleResourceNotFoundException(
                        ResourceNotFoundException e,
                        HttpServletRequest request) {
                return buildErrorResponse(NOT_FOUND, e.getMessage(), request);
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ResponseError> handleMethodArgumentNotValidException(
                        MethodArgumentNotValidException e,
                        HttpServletRequest request) {
                List<String> errorMessages = e.getBindingResult()
                                .getFieldErrors()
                                .stream()
                                .map(FieldError::getDefaultMessage)
                                .filter(message -> message != null && !message.isBlank())
                                .toList();

                String message = errorMessages.isEmpty()
                                ? "Dữ liệu không hợp lệ"
                                : String.join("; ", errorMessages);

                return buildErrorResponse(BAD_REQUEST, message, request);
        }

        @ExceptionHandler(ConflictException.class)
        public ResponseEntity<ResponseError> handleConflictException(
                        ConflictException e,
                        HttpServletRequest request) {
                return buildErrorResponse(CONFLICT, e.getMessage(), request);
        }

        @ExceptionHandler(MaxUploadSizeExceededException.class)
        public ResponseEntity<ResponseError> handleMaxUploadSizeExceededException(
                        MaxUploadSizeExceededException e,
                        HttpServletRequest request) {
                return buildErrorResponse(BAD_REQUEST, "File too large!", request);
        }

        @ExceptionHandler(InvalidParamException.class)
        public ResponseEntity<ResponseError> handleInvalidParamException(
                        InvalidParamException e,
                        HttpServletRequest request) {
                return buildErrorResponse(BAD_REQUEST, e.getMessage(), request);
        }

        @ExceptionHandler(InvalidFileTypeException.class)
        public ResponseEntity<ResponseError> handleInvalidFileTypeException(
                        InvalidFileTypeException e,
                        HttpServletRequest request) {
                return buildErrorResponse(BAD_REQUEST, e.getMessage(), request);
        }

        @ExceptionHandler(UnauthenticatedException.class)
        public ResponseEntity<ResponseError> handleUnauthenticatedException(
                        UnauthenticatedException e,
                        HttpServletRequest request) {
                return buildErrorResponse(UNAUTHORIZED, e.getMessage(), request);
        }

        @ExceptionHandler(DisabledException.class)
        public ResponseEntity<ResponseError> handleDisabledException(
                        DisabledException e,
                        HttpServletRequest request) {
                return buildErrorResponse(UNAUTHORIZED, e.getMessage(), request);
        }

        @ExceptionHandler(AccessDeniedException.class)
        public ResponseEntity<ResponseError> handleAccessDeniedException(
                        AccessDeniedException e,
                        HttpServletRequest request) {
                return buildErrorResponse(FORBIDDEN, e.getMessage(), request);
        }

        private ResponseEntity<ResponseError> buildErrorResponse(
                        HttpStatus status,
                        String message,
                        HttpServletRequest request) {
                ResponseError response = ResponseError.builder()
                                .timestamp(new Date())
                                .status(status.value())
                                .error(status.getReasonPhrase())
                                .path(request.getRequestURI())
                                .message(message)
                                .build();

                return ResponseEntity.status(status).body(response);
        }
}