package com.example.backend.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class EventDetailsDTO {
    private Long id;
    private String title;
    private LocalDate startDate;
    private LocalDate endDate;
    private String calendar;
    private String place;
    private Integer ageMin;
    private Integer ageMax;
    private List<String> cibles;  // e.g., ["ENFANT", "MERE"]
    private Map<String, Object> eventType;  // e.g., {"id": 1, "name": "TypeName"}
    private String description;
    private List<Map<String, Object>> photos;  // e.g., [{"base64": "...", "type": "image/png"}]
    private List<Map<String, Object>> meresParticipants;  // Flattened list
    private List<Map<String, Object>> enfantsParticipants;
    private List<Map<String, Object>> famillesParticipants;

    // Constructeur par défaut (requis pour JPA/DTO)
    public EventDetailsDTO() {}

    // Constructeur avec paramètres
    public EventDetailsDTO(Long id, String title, LocalDate startDate, LocalDate endDate, String calendar,
                           String place, Integer ageMin, Integer ageMax, List<String> cibles,
                           Map<String, Object> eventType, String description, List<Map<String, Object>> photos,
                           List<Map<String, Object>> meresParticipants, List<Map<String, Object>> enfantsParticipants,
                           List<Map<String, Object>> famillesParticipants) {
        this.id = id;
        this.title = title;
        this.startDate = startDate;
        this.endDate = endDate;
        this.calendar = calendar;
        this.place = place;
        this.ageMin = ageMin;
        this.ageMax = ageMax;
        this.cibles = cibles;
        this.eventType = eventType;
        this.description = description;
        this.photos = photos;
        this.meresParticipants = meresParticipants;
        this.enfantsParticipants = enfantsParticipants;
        this.famillesParticipants = famillesParticipants;
    }

    // Getters
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public String getCalendar() { return calendar; }
    public String getPlace() { return place; }
    public Integer getAgeMin() { return ageMin; }
    public Integer getAgeMax() { return ageMax; }
    public List<String> getCibles() { return cibles; }
    public Map<String, Object> getEventType() { return eventType; }
    public String getDescription() { return description; }
    public List<Map<String, Object>> getPhotos() { return photos; }
    public List<Map<String, Object>> getMeresParticipants() { return meresParticipants; }
    public List<Map<String, Object>> getEnfantsParticipants() { return enfantsParticipants; }
    public List<Map<String, Object>> getFamillesParticipants() { return famillesParticipants; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public void setCalendar(String calendar) { this.calendar = calendar; }
    public void setPlace(String place) { this.place = place; }
    public void setAgeMin(Integer ageMin) { this.ageMin = ageMin; }
    public void setAgeMax(Integer ageMax) { this.ageMax = ageMax; }
    public void setCibles(List<String> cibles) { this.cibles = cibles; }
    public void setEventType(Map<String, Object> eventType) { this.eventType = eventType; }
    public void setDescription(String description) { this.description = description; }
    public void setPhotos(List<Map<String, Object>> photos) { this.photos = photos; }
    public void setMeresParticipants(List<Map<String, Object>> meresParticipants) { this.meresParticipants = meresParticipants; }
    public void setEnfantsParticipants(List<Map<String, Object>> enfantsParticipants) { this.enfantsParticipants = enfantsParticipants; }
    public void setFamillesParticipants(List<Map<String, Object>> famillesParticipants) { this.famillesParticipants = famillesParticipants; }
}
