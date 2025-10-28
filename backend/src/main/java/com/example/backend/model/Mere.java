// Mere.java
package com.example.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mere")
public class Mere {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;
    private String cin;
    private String phone;
    private String villeNaissance;
    private String dateNaissance;
    private String dateDeces;
    private String typeMaladie;
    private String typeTravail;
    private Boolean estDecedee = false;
    private Boolean estMalade = false;
    private Boolean estTravaille = false;
    private String photoMere;

    // Getters / Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }
    public String getCin() { return cin; }
    public void setCin(String cin) { this.cin = cin; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getVilleNaissance() { return villeNaissance; }
    public void setVilleNaissance(String villeNaissance) { this.villeNaissance = villeNaissance; }
    public String getDateNaissance() { return dateNaissance; }
    public void setDateNaissance(String dateNaissance) { this.dateNaissance = dateNaissance; }
    public String getDateDeces() { return dateDeces; }
    public void setDateDeces(String dateDeces) { this.dateDeces = dateDeces; }
    public String getTypeMaladie() { return typeMaladie; }
    public void setTypeMaladie(String typeMaladie) { this.typeMaladie = typeMaladie; }
    public String getTypeTravail() { return typeTravail; }
    public void setTypeTravail(String typeTravail) { this.typeTravail = typeTravail; }
    public Boolean getEstDecedee() { return estDecedee; }
    public void setEstDecedee(Boolean estDecedee) { this.estDecedee = estDecedee; }
    public Boolean getEstMalade() { return estMalade; }
    public void setEstMalade(Boolean estMalade) { this.estMalade = estMalade; }
    public Boolean getEstTravaille() { return estTravaille; }
    public void setEstTravaille(Boolean estTravaille) { this.estTravaille = estTravaille; }
    public String getPhotoMere() { return photoMere; }
    public void setPhotoMere(String photoMere) { this.photoMere = photoMere; }
}
