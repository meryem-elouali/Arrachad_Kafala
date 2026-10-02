package com.example.backend.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "economic_incomes")
public class EconomicIncome {

    // ============================================================
    // ID
    // ============================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // ============================================================
    // ANNEE SCOLAIRE
    // Exemple : 2026/2027
    // ============================================================

    @Column(
            name = "annee_scolaire",
            length = 9,
            nullable = false
    )
    private String anneeScolaire;


    // ============================================================
    // FONDS / صندوق
    // ============================================================

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(
            name = "fund_id",
            nullable = false
    )
    private EconomicFund fund;


    // ============================================================
    // MONTANT
    // ============================================================

    @Column(
            precision = 14,
            scale = 2,
            nullable = false
    )
    private BigDecimal montant = BigDecimal.ZERO;


    // ============================================================
    // DATE
    // ============================================================

    @Column(name = "date_reception")
    private LocalDate dateReception;


    // ============================================================
    // SOURCE
    // ============================================================

    @Column(length = 255)
    private String source;


    // ============================================================
    // MODE DE PAIEMENT
    // ============================================================

    @Column(
            name = "mode_paiement",
            length = 100
    )
    private String modePaiement;


    // ============================================================
    // REFERENCE PAIEMENT
    // ============================================================

    @Column(
            name = "reference_paiement",
            length = 180
    )
    private String referencePaiement;


    // ============================================================
    // NOTE
    // ============================================================

    @Column(columnDefinition = "TEXT")
    private String note;


    // ============================================================
    // CONSTRUCTEUR VIDE OBLIGATOIRE POUR JPA
    // ============================================================

    public EconomicIncome() {
    }


    // ============================================================
    // GETTERS / SETTERS
    // ============================================================

    public Long getId() {
        return id;
    }

    public void setId(
            Long id
    ) {
        this.id = id;
    }


    public String getAnneeScolaire() {
        return anneeScolaire;
    }

    public void setAnneeScolaire(
            String anneeScolaire
    ) {
        this.anneeScolaire =
                anneeScolaire;
    }


    public EconomicFund getFund() {
        return fund;
    }

    public void setFund(
            EconomicFund fund
    ) {
        this.fund = fund;
    }


    public BigDecimal getMontant() {
        return montant;
    }

    public void setMontant(
            BigDecimal montant
    ) {
        this.montant =
                montant != null
                        ? montant
                        : BigDecimal.ZERO;
    }


    public LocalDate getDateReception() {
        return dateReception;
    }

    public void setDateReception(
            LocalDate dateReception
    ) {
        this.dateReception =
                dateReception;
    }


    public String getSource() {
        return source;
    }

    public void setSource(
            String source
    ) {
        this.source = source;
    }


    public String getModePaiement() {
        return modePaiement;
    }

    public void setModePaiement(
            String modePaiement
    ) {
        this.modePaiement =
                modePaiement;
    }


    public String getReferencePaiement() {
        return referencePaiement;
    }

    public void setReferencePaiement(
            String referencePaiement
    ) {
        this.referencePaiement =
                referencePaiement;
    }


    public String getNote() {
        return note;
    }

    public void setNote(
            String note
    ) {
        this.note = note;
    }
}