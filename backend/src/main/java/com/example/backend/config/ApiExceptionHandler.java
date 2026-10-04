package com.example.backend.config;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(HttpError.class)
    public ResponseEntity<String> http(HttpError e) {
        return ResponseEntity.status(e.getStatus()).contentType(MediaType.TEXT_PLAIN).body(e.getMessage());
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<String> tropGros(org.springframework.web.multipart.MaxUploadSizeExceededException e) {
        return ResponseEntity.status(413).contentType(MediaType.TEXT_PLAIN).body("حجم الملفات يتجاوز الحد المسموح");
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<String> notFound(NoSuchElementException e) {
        return ResponseEntity.status(404).contentType(MediaType.TEXT_PLAIN).body("غير موجود");
    }
}