package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
public class MembreLajna {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;
    private String phone;
    private Boolean actif = true;

    @ManyToOne
    private FonctionLajna fonction;

    private String role = "SIMPLE";          // SUPER_ADMIN, ADMIN, SIMPLE

    @Column(unique = true)
    private String username;

    @JsonIgnore
    private String motDePasse;

    private Boolean compteActif = false;
    private LocalDateTime derniereConnexion;

    @JsonIgnore
    public String getNomComplet() {
        return ((prenom == null ? "" : prenom) + " " + (nom == null ? "" : nom)).trim();
    }
}