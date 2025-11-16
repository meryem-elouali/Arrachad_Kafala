package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "ecoles")
public class Ecole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom; // nom de l'école


    @OneToMany(mappedBy = "ecole")
    @JsonIgnore
    private List<Etude> etudes; // relation avec les études des enfants

    // getters & setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }


    public List<Etude> getEtudes() {
        return etudes;
    }

    public void setEtudes(List<Etude> etudes) {
        this.etudes = etudes;
    }
}
