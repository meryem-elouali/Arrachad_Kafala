package com.example.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "economic_funds")
public class EconomicFund {

    // ============================================================
    // ID
    // ============================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // ============================================================
    // CODE TECHNIQUE DU FONDS
    //
    // Exemples :
    // DEGRE_DEFINI
    // DEGRE_NON_DEFINI
    // SAAWED_AL_KHAYR
    // SARATAN
    // FUND_xxxxx pour les fonds personnalisés
    // ============================================================

    @Column(
            unique = true,
            nullable = false,
            length = 100
    )
    private String code;


    // ============================================================
    // NOM AFFICHÉ
    //
    // Exemple :
    // صندوق الأيتام
    // ============================================================

    @Column(
            nullable = false,
            length = 180
    )
    private String nom;


    // ============================================================
    // FONDS SYSTÈME
    //
    // true :
    // صندوق الأيتام
    // صندوق المعوز
    // صندوق سواعد الخير
    // صندوق السرطان
    //
    // false :
    // fonds créé manuellement
    // ============================================================

    @Column(nullable = false)
    private Boolean systeme = false;


    // ============================================================
    // ACTIF
    // ============================================================

    @Column(nullable = false)
    private Boolean active = true;


    // ============================================================
    // ORDRE D'AFFICHAGE
    // ============================================================

    @Column(nullable = false)
    private Integer ordre = 0;


    // ============================================================
    // CONSTRUCTEUR VIDE JPA
    // ============================================================

    public EconomicFund() {
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


    public String getCode() {
        return code;
    }

    public void setCode(
            String code
    ) {
        this.code = code;
    }


    public String getNom() {
        return nom;
    }

    public void setNom(
            String nom
    ) {
        this.nom = nom;
    }


    public Boolean getSysteme() {
        return systeme;
    }

    public void setSysteme(
            Boolean systeme
    ) {
        this.systeme =
                systeme != null
                        ? systeme
                        : false;
    }


    public Boolean getActive() {
        return active;
    }

    public void setActive(
            Boolean active
    ) {
        this.active =
                active != null
                        ? active
                        : true;
    }


    public Integer getOrdre() {
        return ordre;
    }

    public void setOrdre(
            Integer ordre
    ) {
        this.ordre =
                ordre != null
                        ? ordre
                        : 0;
    }
}