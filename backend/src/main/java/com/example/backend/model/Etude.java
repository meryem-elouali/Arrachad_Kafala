package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;  // <-- AJOUTER CET IMPORT
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;

@Entity
@Table(name = "etudes")
@JsonIgnoreProperties(ignoreUnknown = true)  // <-- AJOUTER CETTE ANNOTATION À LA CLASSE
public class Etude {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "enfant_id")
    @JsonIgnoreProperties({"famille","eventParticipants","photoEnfant"})
    private Enfant enfant;


    @ManyToOne
    @JoinColumn(name = "ecole_id")
    // @JsonManagedReference supprimé car non nécessaire (pas de relation bidirectionnelle évidente)
    private Ecole ecole;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "niveauscolaire_id")
    // @JsonManagedReference supprimé car non nécessaire (pas de relation bidirectionnelle évidente)
    private NiveauScolaire niveauScolaire;

    private String anneeScolaire;
    private Double noteSemestre1;
    private Double noteSemestre2;
    private Boolean redoublon;
    @Transient  // <-- ne sera pas stocké en base
    private Boolean anneeCourante;
    public Boolean getAnneeCourante() {
        // Si redoublon == null -> null
        if (redoublon == null) {
            return null;
        }
        // Si redoublon == false (non redoublé) -> année courante = true
        // Si redoublon == true (redoublon) -> année courante = false
        return !redoublon;
    }
    public Boolean getPasseAnnee() {
        return redoublon != null ? !redoublon : null;
    }

    // getters & setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Enfant getEnfant() {
        return enfant;
    }

    public void setEnfant(Enfant enfant) {
        this.enfant = enfant;
    }

    public Ecole getEcole() {
        return ecole;
    }

    public void setEcole(Ecole ecole) {
        this.ecole = ecole;
    }

    public NiveauScolaire getNiveauScolaire() {
        return niveauScolaire;
    }

    public void setNiveauScolaire(NiveauScolaire niveauScolaire) {
        this.niveauScolaire = niveauScolaire;
    }

    public String getAnneeScolaire() {
        return anneeScolaire;
    }

    public void setAnneeScolaire(String anneeScolaire) {
        this.anneeScolaire = anneeScolaire;
    }

    public Double getNoteSemestre1() {
        return noteSemestre1;
    }

    public void setNoteSemestre1(Double noteSemestre1) {
        this.noteSemestre1 = noteSemestre1;
    }

    public Double getNoteSemestre2() {
        return noteSemestre2;
    }

    public void setNoteSemestre2(Double noteSemestre2) {
        this.noteSemestre2 = noteSemestre2;
    }

    public Boolean getRedoublon() {
        return redoublon;
    }

    public void setRedoublon(Boolean redoublon) {
        this.redoublon = redoublon;
    }
}