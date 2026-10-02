package com.example.backend.config;

public class HttpError extends RuntimeException {
    private final int status;
    public HttpError(int status, String message) { super(message); this.status = status; }
    public int getStatus() { return status; }
}