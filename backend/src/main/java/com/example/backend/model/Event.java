package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    @Column(name = "place", nullable = false)
    private String place;
    @Column(name = "end_date")
    private LocalDate endDate;

    @ElementCollection(targetClass = Cible.class)
    @Enumerated(EnumType.STRING)
    @Column(name = "cible")
    private List<Cible> cibles = new ArrayList<>();



    @Column(name = "calendar_level", nullable = false)
    private String calendarLevel;
    public String getPlace() {
        return place;
    }

    public void setPlace(String place) {
        this.place = place;
    }

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



    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("event-participants")
    private List<EventParticipant> participants = new ArrayList<>();


    public List<EventParticipant> getParticipants() { return participants; }
    public void setParticipants(List<EventParticipant> participants) { this.participants = participants; }


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

    @JsonProperty("cible")  // ✅ Ajouté ici
    public List<Cible> getCibles() {
        return cibles;
    }

    public void setCibles(List<Cible> cibles) {
        this.cibles = cibles;
    }

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


    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }
    public List<EventParticipant> getMereParticipants() {
        return participants.stream()
                .filter(p -> p.getParticipantType() == ParticipantType.MERE)
                .toList();
    }

    public List<EventParticipant> getEnfantParticipants() {
        return participants.stream()
                .filter(p -> p.getParticipantType() == ParticipantType.ENFANT)
                .toList();
    }

    public List<EventParticipant> getFamilleParticipants() {
        return participants.stream()
                .filter(p -> p.getParticipantType() == ParticipantType.FAMILLE)
                .toList();
    }
    public void setMereParticipants(List<Mere> meres) {
        // Supprime les anciens participants de type MERE
        participants.removeIf(p -> p.getParticipantType() == ParticipantType.MERE);

        // Ajoute les nouveaux
        for (Mere m : meres) {
            EventParticipant ep = new EventParticipant();
            ep.setParticipantType(ParticipantType.MERE);
            ep.setMere(m);
            ep.setEvent(this);
            participants.add(ep);
        }
    }

    public void setEnfantsParticipants(List<Enfant> enfants) {
        participants.removeIf(p -> p.getParticipantType() == ParticipantType.ENFANT);

        for (Enfant e : enfants) {
            EventParticipant ep = new EventParticipant();
            ep.setParticipantType(ParticipantType.ENFANT);
            ep.setEnfant(e);
            ep.setEvent(this);
            participants.add(ep);
        }
    }

    public void setFamilleParticipants(List<Famille> familles) {
        participants.removeIf(p -> p.getParticipantType() == ParticipantType.FAMILLE);

        for (Famille f : familles) {
            EventParticipant ep = new EventParticipant();
            ep.setParticipantType(ParticipantType.FAMILLE);
            ep.setFamille(f);
            ep.setEvent(this);
            participants.add(ep);
        }
    }

}
