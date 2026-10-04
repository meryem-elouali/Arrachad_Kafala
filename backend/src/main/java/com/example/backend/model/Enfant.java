package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;  // <-- AJOUTER CET IMPORT
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;

@Entity
@Table(name = "enfants")
@JsonIgnoreProperties(ignoreUnknown = true)  // <-- AJOUTER CETTE ANNOTATION À LA CLASSE
public class Enfant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String prenom;
    private String nom;
    private String dateNaissance;
    private String typeMaladie;
    private Boolean estMalade = false;

    /** FILLE ou GARCON */
    @Column(length = 10)
    private String sexe;

    // =========================================================
    // STATUT SCOLAIRE
    // EN_COURS  : suivi dans « تتبع الدراسة »
    // ARRETE    : a arrêté ses études (historique conservé)
    // NON_SUIVI : ne nécessite pas de suivi scolaire
    // Valeur absente (enfants existants) = EN_COURS.
    // =========================================================
    public static final String STATUT_EN_COURS = "EN_COURS";
    public static final String STATUT_ARRETE = "ARRETE";
    public static final String STATUT_NON_SUIVI = "NON_SUIVI";
    public static final java.util.List<String> STATUTS_SCOLAIRES =
            java.util.List.of(STATUT_EN_COURS, STATUT_ARRETE, STATUT_NON_SUIVI);

    @Column(name = "statut_scolaire", length = 12)
    private String statutScolaire;

    @Column(name = "date_arret_etudes")
    private LocalDate dateArretEtudes;

    @Column(name = "motif_arret_etudes", length = 255)
    private String motifArretEtudes;

    @Column(name = "remarque_scolaire", length = 1000)
    private String remarqueScolaire;

    @ManyToOne
    @JoinColumn(name = "famille_id")
    @JsonIgnore
    private Famille famille;

    // Relation avec EventParticipant (bidirectionnelle)
    @OneToMany(mappedBy = "enfant", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private java.util.List<EventParticipant> eventParticipants = new java.util.ArrayList<>();

    @JsonIgnore
    @Lob
    private byte[] photoEnfant;
    // ----------------------------
// Retour de la photo en Base64 pour le frontend
// ----------------------------
    @Transient
    @JsonProperty("photoEnfant")
    public String getPhotoEnfantBase64() {
        if (photoEnfant != null) {
            return java.util.Base64.getEncoder().encodeToString(photoEnfant);
        }
        return null;
    }

    // getters & setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getDateNaissance() {
        return dateNaissance;
    }

    public void setDateNaissance(String dateNaissance) {
        this.dateNaissance = dateNaissance;
    }

    public String getTypeMaladie() {
        return typeMaladie;
    }

    public void setTypeMaladie(String typeMaladie) {
        this.typeMaladie = typeMaladie;
    }

    public Boolean getEstMalade() {
        return estMalade;
    }

    public void setEstMalade(Boolean estMalade) {
        this.estMalade = estMalade;
    }

    public Famille getFamille() {
        return famille;
    }

    public void setFamille(Famille famille) {
        this.famille = famille;
    }

    public byte[] getPhotoEnfant() {
        return photoEnfant;
    }

    public void setPhotoEnfant(byte[] photoEnfant) {
        this.photoEnfant = photoEnfant;
    }

    public java.util.List<EventParticipant> getEventParticipants() {
        return eventParticipants;
    }

    public void setEventParticipants(java.util.List<EventParticipant> eventParticipants) {
        this.eventParticipants = eventParticipants;
    }

    // ----------------------------
    // Accès direct aux Events
    // ----------------------------
    @Transient
    public java.util.List<Event> getEvents() {
        return eventParticipants.stream()
                .map(EventParticipant::getEvent)
                .toList();
    }

    // ----------------------------
    // Calcul de l'âge
    // ----------------------------
    @Transient
    public int getAge() {
        if (dateNaissance == null || dateNaissance.isEmpty()) return 0;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate birthDate = LocalDate.parse(dateNaissance, formatter);
        return Period.between(birthDate, LocalDate.now()).getYears();
    }

    public String getSexe() {
        return sexe;
    }

    public void setSexe(String sexe) {
        this.sexe = normaliserSexe(sexe);
    }

    public static String normaliserSexe(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.trim().toUpperCase();
        if (v.equals("FILLE") || v.equals("F") || value.trim().equals("أنثى") || value.trim().equals("بنت")) return "FILLE";
        if (v.equals("GARCON") || v.equals("G") || v.equals("M") || value.trim().equals("ذكر") || value.trim().equals("ولد")) return "GARCON";
        return null;
    }

    /**
     * Le nom de famille de l'enfant est, par défaut, celui du père.
     */
    @PrePersist
    @PreUpdate
    public void appliquerNomParDefaut() {
        if ((nom == null || nom.isBlank())
                && famille != null
                && famille.getPere() != null
                && famille.getPere().getNom() != null
                && !famille.getPere().getNom().isBlank()) {
            nom = famille.getPere().getNom().trim();
        }
    }

    public String getStatutScolaire() {
        // Valeur absente (enfants existants) = en cours d'études.
        // Attention : List.of(...).contains(null) lève une NullPointerException.
        return statutScolaire != null && STATUTS_SCOLAIRES.contains(statutScolaire) ? statutScolaire : STATUT_EN_COURS;
    }

    /** Statut normalisé ; les informations d'arrêt ne sont conservées que pour ARRETE. */
    public void setStatutScolaire(String statut) {
        String s = statut == null ? STATUT_EN_COURS : statut.trim().toUpperCase();
        if (!STATUTS_SCOLAIRES.contains(s)) {
            throw new IllegalArgumentException("Statut scolaire invalide : " + statut);
        }
        this.statutScolaire = s;
        if (!STATUT_ARRETE.equals(s)) {
            this.dateArretEtudes = null;
            this.motifArretEtudes = null;
        }
    }

    public boolean estScolarise() {
        return STATUT_EN_COURS.equals(getStatutScolaire());
    }

    public LocalDate getDateArretEtudes() {
        return dateArretEtudes;
    }

    public void setDateArretEtudes(LocalDate dateArretEtudes) {
        this.dateArretEtudes = dateArretEtudes;
    }

    public String getMotifArretEtudes() {
        return motifArretEtudes;
    }

    public void setMotifArretEtudes(String motifArretEtudes) {
        this.motifArretEtudes = motifArretEtudes;
    }

    public String getRemarqueScolaire() {
        return remarqueScolaire;
    }

    public void setRemarqueScolaire(String remarqueScolaire) {
        this.remarqueScolaire = remarqueScolaire;
    }
}
