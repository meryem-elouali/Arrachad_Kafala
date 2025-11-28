package com.example.backend.model;

import com.example.backend.model.Event;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "event_participants")
public class EventParticipant implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "event_id", nullable = false)
    @JsonBackReference("event_participants") // OK
    private Event event;

    @ManyToOne
    @JoinColumn(name = "mere_id")
    @JsonIgnore
    private Mere mere;

    @ManyToOne
    @JoinColumn(name = "enfant_id")
    @JsonIgnore
    private Enfant enfant;

    @ManyToOne
    @JoinColumn(name = "famille_id")
    @JsonIgnore
    private Famille famille;

    // type de participant (MERE, ENFANT, FAMILLE)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParticipantType participantType;

    // présence
    @Column(nullable = false)
    private Boolean present = true;

    // raison d'absence si non présent
    @Column(columnDefinition = "TEXT")
    private String absenceReason;

    // ----------------------------
    // Getters et Setters
    // ----------------------------
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }

    public Mere getMere() { return mere; }
    public void setMere(Mere mere) { this.mere = mere; }

    public Enfant getEnfant() { return enfant; }
    public void setEnfant(Enfant enfant) { this.enfant = enfant; }

    public Famille getFamille() { return famille; }
    public void setFamille(Famille famille) { this.famille = famille; }

    public ParticipantType getParticipantType() { return participantType; }
    public void setParticipantType(ParticipantType participantType) { this.participantType = participantType; }

    public Boolean getPresent() { return present; }
    public void setPresent(Boolean present) { this.present = present; }

    public String getAbsenceReason() { return absenceReason; }
    public void setAbsenceReason(String absenceReason) { this.absenceReason = absenceReason; }
}