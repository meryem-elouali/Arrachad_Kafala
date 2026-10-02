package com.example.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "economic_categories")
public class EconomicCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Code technique.
     *
     * Pour les catégories système :
     * - DEGRE_DEFINI
     * - DEGRE_NON_DEFINI
     * - SAAWED_AL_KHAYR
     *
     * Pour les catégories spéciales, le code est généré automatiquement.
     */
    @Column(name = "code", unique = true, length = 80)
    private String code;

    @Column(name = "nom", nullable = false, length = 180)
    private String nom;

    /**
     * true  = catégorie système non supprimable
     * false = catégorie spéciale paramétrable
     */
    @Column(name = "systeme", nullable = false)
    private Boolean systeme = false;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "ordre", nullable = false)
    private Integer ordre = 0;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public Boolean getSysteme() {
        return systeme;
    }

    public void setSysteme(Boolean systeme) {
        this.systeme = systeme != null ? systeme : false;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active != null ? active : true;
    }

    public Integer getOrdre() {
        return ordre;
    }

    public void setOrdre(Integer ordre) {
        this.ordre = ordre != null ? ordre : 0;
    }
}
