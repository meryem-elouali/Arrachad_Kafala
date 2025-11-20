package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ------------------------------------
    // Base infos
    // ------------------------------------
    @Column(nullable = false)
    private String title;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Cible cible;

    @Column(name = "calendar_level", nullable = false)
    private String calendarLevel;

    @Column(name = "age_min")
    private Integer ageMin;

    @Column(name = "age_max")
    private Integer ageMax;

    // ------------------------------------
    // Description
    // ------------------------------------
    @Column(columnDefinition = "TEXT")
    private String description = "";


    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<EventFile> files = new ArrayList<>();




    @ManyToMany(fetch = FetchType.EAGER, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "event_meres",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "mere_id")
    )
    private List<Mere> meresParticipants = new ArrayList<>();
    @ManyToMany(fetch = FetchType.EAGER, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "event_enfants",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "enfant_id")
    )
    private List<Enfant> enfantsParticipants = new ArrayList<>();

    // ------------------------------------
    // Type de l'événement
    // ------------------------------------
    @ManyToOne
    @JoinColumn(name = "event_type_id", nullable = false)
    private EventType eventType;


    // ------------------------------------
    // Getters & Setters
    // ------------------------------------
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public Cible getCible() { return cible; }
    public void setCible(Cible cible) { this.cible = cible; }

    public String getCalendarLevel() { return calendarLevel; }
    public void setCalendarLevel(String calendarLevel) { this.calendarLevel = calendarLevel; }

    public Integer getAgeMin() { return ageMin; }
    public void setAgeMin(Integer ageMin) { this.ageMin = ageMin; }

    public Integer getAgeMax() { return ageMax; }
    public void setAgeMax(Integer ageMax) { this.ageMax = ageMax; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<EventFile> getFiles() {
        return files;
    }

    public void setFiles(List<EventFile> files) {
        this.files = files;
    }

    public List<Mere> getMeresParticipants() { return meresParticipants; }
    public void setMeresParticipants(List<Mere> meresParticipants) { this.meresParticipants = meresParticipants; }

    public List<Enfant> getEnfantsParticipants() { return enfantsParticipants; }
    public void setEnfantsParticipants(List<Enfant> enfantsParticipants) { this.enfantsParticipants = enfantsParticipants; }

    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }
}
