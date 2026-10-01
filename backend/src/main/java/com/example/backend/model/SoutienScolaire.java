package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "soutien_scolaire")
@JsonIgnoreProperties(ignoreUnknown = true)
public class SoutienScolaire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================
    // ENFANT
    // =========================================================
// Montant réellement payé par notre association
    private Double montantPaye;
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
    // ANNEE
    // =========================================================

    private String anneeScolaire;

    // =========================================================
    // MOIS
    // =========================================================

    private String mois;
    public Double getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Double montantPaye) {
        this.montantPaye = montantPaye;
    }
    // =========================================================
    // CENTRE
    // =========================================================

    private String centre;

    // =========================================================
    // PROF / INTERVENANT
    // =========================================================

    private String intervenant;

    // =========================================================
    // MONTANT DU MOIS
    // =========================================================

    private Double montant;

    // =========================================================
    // A-T-IL BENEFICIE CE MOIS ?
    // =========================================================

    private Boolean effectue = false;

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

    public String getAnneeScolaire() {
        return anneeScolaire;
    }

    public void setAnneeScolaire(String anneeScolaire) {
        this.anneeScolaire = anneeScolaire;
    }

    public String getMois() {
        return mois;
    }

    public void setMois(String mois) {
        this.mois = mois;
    }

    public String getCentre() {
        return centre;
    }

    public void setCentre(String centre) {
        this.centre = centre;
    }

    public String getIntervenant() {
        return intervenant;
    }

    public void setIntervenant(String intervenant) {
        this.intervenant = intervenant;
    }

    public Double getMontant() {
        return montant;
    }

    public void setMontant(Double montant) {
        this.montant = montant;
    }

    public Boolean getEffectue() {
        return effectue;
    }

    public void setEffectue(Boolean effectue) {
        this.effectue = effectue;
    }
}