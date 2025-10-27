package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "Mere")
public class Mere {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;





    @Column(name = "phone_mere")
    private Integer phone;
    @Column(name = "nom_mere")
    private String nom;
    @Column(name = "prenom_mere")
    private String prenom;
    @Column(name = "cin_mere")
    private String cin;

    @Column(name = "date_naissance_mere")
    private LocalDate datenaissance;
    @Column(name = "ville_naissance_mere")
    private String villenaissance;
    @Column(name = "mere_travaille")
    private Boolean sitravaille;
    @Column(name = "desc_travaille_mere")
    private String desctravaille;
    @Column(name = "mere_malade")
    private Boolean simalade;
    @Column(name = "desc_maladie_mere")
    private String descmaladie;
    @Column(name = "mere_deceder")
    private Boolean sideceder;
    @Column(name = "date_deces_mere")
    private LocalDate datedeces;
    @Column(name = "photo_mere")
    @Lob
    private byte[] photo;

    public Long getId() {
        return id;
    }

    public Integer getPhone() {
        return phone;
    }

    public String getNom() {
        return nom;
    }

    public String getPrenom() {
        return prenom;
    }

    public String getCin() {
        return cin;
    }

    public LocalDate getDatenaissance() {
        return datenaissance;
    }

    public String getVillenaissance() {
        return villenaissance;
    }

    public Boolean getSitravaille() {
        return sitravaille;
    }

    public String getDesctravaille() {
        return desctravaille;
    }

    public Boolean getSimalade() {
        return simalade;
    }

    public String getDescmaladie() {
        return descmaladie;
    }

    public byte[] getPhoto() {
        return photo;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setPhone(Integer phone) {
        this.phone = phone;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public void setCin(String cin) {
        this.cin = cin;
    }

    public void setDatenaissance(LocalDate datenaissance) {
        this.datenaissance = datenaissance;
    }

    public void setVillenaissance(String villenaissance) {
        this.villenaissance = villenaissance;
    }

    public void setSitravaille(Boolean sitravaille) {
        this.sitravaille = sitravaille;
    }

    public void setDesctravaille(String desctravaille) {
        this.desctravaille = desctravaille;
    }

    public void setSimalade(Boolean simalade) {
        this.simalade = simalade;
    }

    public void setDescmaladie(String descmaladie) {
        this.descmaladie = descmaladie;
    }

    public void setPhoto(byte[] photo) {
        this.photo = photo;
    }

    public Boolean getSideceder() {
        return sideceder;
    }

    public LocalDate getDatedeces() {
        return datedeces;
    }

    public void setSideceder(Boolean sideceder) {
        this.sideceder = sideceder;
    }

    public void setDatedeces(LocalDate datedeces) {
        this.datedeces = datedeces;
    }
}
