package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

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

    @ManyToOne
    @JoinColumn(name = "famille_id")
    @JsonIgnore
    private Famille famille;

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
}
