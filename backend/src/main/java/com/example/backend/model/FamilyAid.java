package com.example.backend.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Dépense faite pour une famille, prélevée sur une caisse (صندوق).
 * Ces dépenses sont comptées automatiquement dans les sorties de la caisse.
 */
@Entity
@Table(name = "famille_depenses")
public class FamilyAid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "famille_id", nullable = false)
    private Famille famille;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "caisse_id", nullable = false)
    private EconomicCategory caisse;

    /**
     * Exemple : 2026/2027
     */
    @Column(name = "annee_scolaire", nullable = false, length = 9)
    private String anneeScolaire;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal montant = BigDecimal.ZERO;

    @Column(name = "date_depense", nullable = false)
    private LocalDate dateDepense;

    /**
     * Exemple : مساعدة علاجية، شراء أدوية، مساعدة استثنائية
     */
    @Column(length = 255)
    private String libelle;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (montant == null) {
            montant = BigDecimal.ZERO;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Famille getFamille() {
        return famille;
    }

    public void setFamille(Famille famille) {
        this.famille = famille;
    }

    public EconomicCategory getCaisse() {
        return caisse;
    }

    public void setCaisse(EconomicCategory caisse) {
        this.caisse = caisse;
    }

    public String getAnneeScolaire() {
        return anneeScolaire;
    }

    public void setAnneeScolaire(String anneeScolaire) {
        this.anneeScolaire = anneeScolaire;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public void setMontant(BigDecimal montant) {
        this.montant = montant != null ? montant : BigDecimal.ZERO;
    }

    public LocalDate getDateDepense() {
        return dateDepense;
    }

    public void setDateDepense(LocalDate dateDepense) {
        this.dateDepense = dateDepense;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
