package com.example.backend.model;

import jakarta.persistence.*;



@Entity
@Table(name = "enfants")
public class Enfant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String prenom;           // الاسم
    private String nom;              // النسب
    private String dateNaissance;    // تاريخ الازدياد (ou LocalDate si tu préfères)

    @ManyToOne
    @JoinColumn(name = "famille_id") // clé étrangère
    private Famille famille;
    // 🔹 Relation avec le niveau scolaire
    @ManyToOne
    @JoinColumn(name = "niveauscolaire_id")
    private NiveauScolaire niveauscolaire;
    @Lob
    private byte[] photoEnfant;

    public byte[] getPhotoEnfant() {
        return photoEnfant;
    }

    public void setPhotoEnfant(byte[] photoEnfant) {
        this.photoEnfant = photoEnfant;
    }

    public Long getId() {
        return id;
    }

    public String getPrenom() {
        return prenom;
    }

    public String getNom() {
        return nom;
    }

    public String getDateNaissance() {
        return dateNaissance;
    }

    public NiveauScolaire getNiveauscolaire() {
        return niveauscolaire;
    }
// 🔹 Relation avec la famille (clé étrangère)

    public void setId(Long id) {
        this.id = id;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public void setDateNaissance(String dateNaissance) {
        this.dateNaissance = dateNaissance;
    }

    public void setNiveauscolaire(NiveauScolaire niveauscolaire) {
        this.niveauscolaire = niveauscolaire;
    }

    public Famille getFamille() {
        return famille;
    }

    public void setFamille(Famille famille) {
        this.famille = famille;
    }
}
