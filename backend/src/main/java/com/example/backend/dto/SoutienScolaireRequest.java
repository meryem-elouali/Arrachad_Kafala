package com.example.backend.dto;

public class SoutienScolaireRequest {

    private Long enfantId;

    private String anneeScolaire;

    private String mois;

    private String centre;

    private String intervenant;

    private Double montant;

    private Boolean effectue;
    private Double montantPaye;

    public Double getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Double montantPaye) {
        this.montantPaye = montantPaye;
    }
    public Long getEnfantId() {
        return enfantId;
    }

    public void setEnfantId(Long enfantId) {
        this.enfantId = enfantId;
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