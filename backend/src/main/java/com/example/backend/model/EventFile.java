package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(name = "event_files")
public class EventFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    @Column(name = "file_base64", columnDefinition = "LONGTEXT")
    private String base64;

    @Column(name = "file_type")
    private String type;

    @ManyToOne
    @JoinColumn(name = "event_id")
    @JsonBackReference
    private Event event;

    // getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBase64() { return base64; }
    public void setBase64(String base64) { this.base64 = base64; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }
}
