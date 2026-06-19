package com.example.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "degre_famille")
public class DegreFamille {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer pointParEnfant = 0;
    private Integer pointEnfantMalade = 0;

    private Integer pointHabitationPropriete = 0; // ملك
    private Integer pointHabitationRahn = 0;      // رهن
    private Integer pointHabitationLoyer = 0;     // كراء

    private Integer pointMereTravailleOui = 0;
    private Integer pointMereTravailleNon = 0;

    private Integer pointMereMaladeOui = 0;
    private Integer pointMereMaladeNon = 0;

    private Integer pointAideFamilleOui = 0;
    private Integer pointAideFamilleNon = 0;

    private Integer pointRevenuMensuelOui = 0;
    private Integer pointRevenuMensuelNon = 0;

    private Integer pointAutreAssociationOui = 0;
    private Integer pointAutreAssociationNon = 0;

    private Integer pointPossedeMaladeOui = 0;
    private Integer pointPossedeMaladeNon = 0;

    public Long getId() {
        return id;
    }

    public Integer getPointParEnfant() {
        return pointParEnfant;
    }

    public Integer getPointEnfantMalade() {
        return pointEnfantMalade;
    }

    public Integer getPointHabitationPropriete() {
        return pointHabitationPropriete;
    }

    public Integer getPointHabitationRahn() {
        return pointHabitationRahn;
    }

    public Integer getPointHabitationLoyer() {
        return pointHabitationLoyer;
    }

    public Integer getPointMereTravailleOui() {
        return pointMereTravailleOui;
    }

    public Integer getPointMereTravailleNon() {
        return pointMereTravailleNon;
    }

    public Integer getPointMereMaladeOui() {
        return pointMereMaladeOui;
    }

    public Integer getPointMereMaladeNon() {
        return pointMereMaladeNon;
    }

    public Integer getPointAideFamilleOui() {
        return pointAideFamilleOui;
    }

    public Integer getPointAideFamilleNon() {
        return pointAideFamilleNon;
    }

    public Integer getPointRevenuMensuelOui() {
        return pointRevenuMensuelOui;
    }

    public Integer getPointRevenuMensuelNon() {
        return pointRevenuMensuelNon;
    }

    public Integer getPointAutreAssociationOui() {
        return pointAutreAssociationOui;
    }

    public Integer getPointAutreAssociationNon() {
        return pointAutreAssociationNon;
    }

    public Integer getPointPossedeMaladeOui() {
        return pointPossedeMaladeOui;
    }

    public Integer getPointPossedeMaladeNon() {
        return pointPossedeMaladeNon;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setPointParEnfant(Integer pointParEnfant) {
        this.pointParEnfant = pointParEnfant;
    }

    public void setPointEnfantMalade(Integer pointEnfantMalade) {
        this.pointEnfantMalade = pointEnfantMalade;
    }

    public void setPointHabitationPropriete(Integer pointHabitationPropriete) {
        this.pointHabitationPropriete = pointHabitationPropriete;
    }

    public void setPointHabitationRahn(Integer pointHabitationRahn) {
        this.pointHabitationRahn = pointHabitationRahn;
    }

    public void setPointHabitationLoyer(Integer pointHabitationLoyer) {
        this.pointHabitationLoyer = pointHabitationLoyer;
    }

    public void setPointMereTravailleOui(Integer pointMereTravailleOui) {
        this.pointMereTravailleOui = pointMereTravailleOui;
    }

    public void setPointMereTravailleNon(Integer pointMereTravailleNon) {
        this.pointMereTravailleNon = pointMereTravailleNon;
    }

    public void setPointMereMaladeOui(Integer pointMereMaladeOui) {
        this.pointMereMaladeOui = pointMereMaladeOui;
    }

    public void setPointMereMaladeNon(Integer pointMereMaladeNon) {
        this.pointMereMaladeNon = pointMereMaladeNon;
    }

    public void setPointAideFamilleOui(Integer pointAideFamilleOui) {
        this.pointAideFamilleOui = pointAideFamilleOui;
    }

    public void setPointAideFamilleNon(Integer pointAideFamilleNon) {
        this.pointAideFamilleNon = pointAideFamilleNon;
    }

    public void setPointRevenuMensuelOui(Integer pointRevenuMensuelOui) {
        this.pointRevenuMensuelOui = pointRevenuMensuelOui;
    }

    public void setPointRevenuMensuelNon(Integer pointRevenuMensuelNon) {
        this.pointRevenuMensuelNon = pointRevenuMensuelNon;
    }

    public void setPointAutreAssociationOui(Integer pointAutreAssociationOui) {
        this.pointAutreAssociationOui = pointAutreAssociationOui;
    }

    public void setPointAutreAssociationNon(Integer pointAutreAssociationNon) {
        this.pointAutreAssociationNon = pointAutreAssociationNon;
    }

    public void setPointPossedeMaladeOui(Integer pointPossedeMaladeOui) {
        this.pointPossedeMaladeOui = pointPossedeMaladeOui;
    }

    public void setPointPossedeMaladeNon(Integer pointPossedeMaladeNon) {
        this.pointPossedeMaladeNon = pointPossedeMaladeNon;
    }
}