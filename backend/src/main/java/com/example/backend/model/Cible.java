package com.example.backend.model;

public enum Cible {

    MERE("Mère", "أم"),
    ENFANT("Enfant", "طفل"),
    FAMILLE("Famille", "عائلة");

    private final String nomFr;
    private final String nomAr;

    Cible(String nomFr, String nomAr) {
        this.nomFr = nomFr;
        this.nomAr = nomAr;
    }

    public String getNomFr() {
        return nomFr;
    }

    public String getNomAr() {
        return nomAr;
    }
}