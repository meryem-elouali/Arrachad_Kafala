package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "etudes")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Etude {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================
    // ENFANT
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "enfant_id")
    @JsonIgnoreProperties({
            "famille",
            "eventParticipants",
            "photoEnfant",
            "etudes"
    })
    private Enfant enfant;

    // =========================================================
    // ECOLE
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "ecole_id")
    @JsonIgnoreProperties({
            "hibernateLazyInitializer",
            "handler"
    })
    private Ecole ecole;

    // =========================================================
    // NIVEAU
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "niveauscolaire_id")
    @JsonIgnoreProperties({
            "hibernateLazyInitializer",
            "handler"
    })
    private NiveauScolaire niveauScolaire;

    // =========================================================
    // SPECIALITE
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "specialite_id")
    @JsonIgnoreProperties({
            "hibernateLazyInitializer",
            "handler"
    })
    private Specialite specialite;

    // =========================================================
    // ANNEE
    // =========================================================

    @Column(length = 20)
    private String anneeScolaire;

    // =========================================================
    // NOTES
    // =========================================================

    private Double noteSemestre1;

    private Double noteSemestre2;

    private Double noteGenerale;

    // =========================================================
    // RESULTAT
    // =========================================================

    private Boolean redoublon;

    // =========================================================
    // DETAILS / OBSERVATIONS
    // =========================================================

    @Lob
    @Column(columnDefinition = "TEXT")
    private String details;

    // =========================================================
    // CHAMPS CALCULES
    // =========================================================

    @Transient
    public Boolean getPasseAnnee() {

        if (redoublon == null) {
            return null;
        }

        return !redoublon;
    }

    @Transient
    public Boolean getAnneeCourante() {

        if (anneeScolaire == null || anneeScolaire.isBlank()) {
            return false;
        }

        LocalDate now = LocalDate.now();

        int anneeDepart =
                now.getMonthValue() >= 9
                        ? now.getYear()
                        : now.getYear() - 1;

        String actuelle =
                anneeDepart + "/" + (anneeDepart + 1);

        String valeur =
                anneeScolaire
                        .trim()
                        .replace("-", "/")
                        .replace(" ", "");

        return actuelle.equals(valeur);
    }

    // =========================================================
    // GETTERS / SETTERS
    // =========================================================

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

    public Specialite getSpecialite() {
        return specialite;
    }

    public void setSpecialite(Specialite specialite) {
        this.specialite = specialite;
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

    public Double getNoteGenerale() {
        return noteGenerale;
    }

    public void setNoteGenerale(Double noteGenerale) {
        this.noteGenerale = noteGenerale;
    }

    public Boolean getRedoublon() {
        return redoublon;
    }

    public void setRedoublon(Boolean redoublon) {
        this.redoublon = redoublon;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}