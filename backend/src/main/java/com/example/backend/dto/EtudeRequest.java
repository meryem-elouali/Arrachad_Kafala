package com.example.backend.dto;

public class EtudeRequest {

    private String anneeScolaire;

    private Long enfantId;

    private Long niveauScolaireId;

    private Long ecoleId;

    private Long specialiteId;

    private Double noteSemestre1;

    private Double noteSemestre2;

    private Double noteGenerale;

    private Boolean redoublon;

    private String details;

    public String getAnneeScolaire() {
        return anneeScolaire;
    }

    public void setAnneeScolaire(String anneeScolaire) {
        this.anneeScolaire = anneeScolaire;
    }

    public Long getEnfantId() {
        return enfantId;
    }

    public void setEnfantId(Long enfantId) {
        this.enfantId = enfantId;
    }

    public Long getNiveauScolaireId() {
        return niveauScolaireId;
    }

    public void setNiveauScolaireId(Long niveauScolaireId) {
        this.niveauScolaireId = niveauScolaireId;
    }

    public Long getEcoleId() {
        return ecoleId;
    }

    public void setEcoleId(Long ecoleId) {
        this.ecoleId = ecoleId;
    }

    public Long getSpecialiteId() {
        return specialiteId;
    }

    public void setSpecialiteId(Long specialiteId) {
        this.specialiteId = specialiteId;
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