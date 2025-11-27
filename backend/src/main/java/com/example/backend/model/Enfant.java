package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;

@Entity
@Table(name = "enfants")
public class Enfant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String prenom;
    private String nom;
    private String dateNaissance;
    private String typeMaladie;
    private Boolean estMalade = false;
    @JsonBackReference
    @ManyToOne
    @JoinColumn(name = "famille_id")
    private Famille famille;


    // Relation avec EventParticipant (bidirectionnelle)
    @OneToMany(mappedBy = "enfant", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private java.util.List<EventParticipant> eventParticipants = new java.util.ArrayList<>();

    @JsonIgnore
    @Lob
    private byte[] photoEnfant;

    // getters & setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getDateNaissance() {
        return dateNaissance;
    }

    public void setDateNaissance(String dateNaissance) {
        this.dateNaissance = dateNaissance;
    }

    public String getTypeMaladie() {
        return typeMaladie;
    }

    public void setTypeMaladie(String typeMaladie) {
        this.typeMaladie = typeMaladie;
    }

    public Boolean getEstMalade() {
        return estMalade;
    }

    public void setEstMalade(Boolean estMalade) {
        this.estMalade = estMalade;
    }

    public Famille getFamille() {
        return famille;
    }

    public void setFamille(Famille famille) {
        this.famille = famille;
    }

    public byte[] getPhotoEnfant() {
        return photoEnfant;
    }


    public void setPhotoEnfant(byte[] photoEnfant) {
        this.photoEnfant = photoEnfant;
    }

    public java.util.List<EventParticipant> getEventParticipants() { return eventParticipants; }
    public void setEventParticipants(java.util.List<EventParticipant> eventParticipants) { this.eventParticipants = eventParticipants; }

    // ----------------------------
    // Accès direct aux Events
    // ----------------------------
    @Transient
    public java.util.List<Event> getEvents() {
        return eventParticipants.stream()
                .map(EventParticipant::getEvent)
                .toList();
    }

    // ----------------------------
    // Calcul de l'âge
    // ----------------------------
    @Transient

    public int getAge() {
        if (dateNaissance == null || dateNaissance.isEmpty()) return 0;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd"); // <-- corrigé
        LocalDate birthDate = LocalDate.parse(dateNaissance, formatter);
        return Period.between(birthDate, LocalDate.now()).getYears();
    }

}
