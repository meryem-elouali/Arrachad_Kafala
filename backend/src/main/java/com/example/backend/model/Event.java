package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // =========================================================
    // ANNÉE SCOLAIRE
    // Exemple : 2026/2027
    // =========================================================
    @Column(name = "annee_scolaire", length = 9)
    private String anneeScolaire;


    // =========================================================
    // DEGRÉS DE FAMILLE
    //
    // 1 = degré 1
    // 2 = degré 2
    // 3 = degré 3
    // 0 = degré non défini / معوز
    // =========================================================
    @ElementCollection
    @CollectionTable(
            name = "event_degres_famille",
            joinColumns = @JoinColumn(name = "event_id")
    )
    @Column(name = "degre")
    private List<Integer> degresFamille = new ArrayList<>();


    // =========================================================
    // CAISSE CHOISIE (optionnelle)
    // null = répartition automatique (degré / معوز / سواعد الخير)
    // =========================================================
    @ManyToOne
    @JoinColumn(name = "caisse_id")
    private EconomicCategory caisse;

    // =========================================================
    // CHARGE SUPPLÉMENTAIRE
    // =========================================================
    @Column(
            precision = 19,
            scale = 2
    )
    private BigDecimal chargeSupplementaire =
            BigDecimal.ZERO;

    private String chargeSupplementaireLabel;


    // =========================================================
    // INFORMATIONS DE BASE
    // =========================================================
    @Column(nullable = false)
    private String title;


    @Column(
            precision = 14,
            scale = 2
    )
    private BigDecimal montantTotal =
            BigDecimal.ZERO;


    @Column(name = "type_montant")
    private String typeMontant;


    @Column(name = "mode_repartition")
    private String modeRepartition;


    @Column(
            name = "montant_global",
            precision = 14,
            scale = 2
    )
    private BigDecimal montantGlobal =
            BigDecimal.ZERO;


    @Column(
            name = "start_date",
            nullable = false
    )
    private LocalDate startDate;


    @Column(name = "place")
    private String place;


    @Column(name = "end_date")
    private LocalDate endDate;


    // =========================================================
    // سواعد الخير
    //
    // false = activité normale
    // true  = activité financée par سواعد الخير
    // =========================================================
    @Column(
            name = "sawaed_al_khayr",
            nullable = false
    )
    private Boolean sawaedAlKhayr = false;


    // =========================================================
    // CIBLES
    // =========================================================
    @ElementCollection(
            targetClass = Cible.class
    )
    @Enumerated(EnumType.STRING)
    @CollectionTable(
            name = "event_cibles",
            joinColumns = @JoinColumn(name = "event_id")
    )
    @Column(name = "cible")
    private List<Cible> cibles =
            new ArrayList<>();


    // =========================================================
    // CALENDRIER / ÂGE
    // =========================================================
    @Column(
            name = "calendar_level",
            nullable = false
    )
    private String calendarLevel;


    @Column(name = "age_min")
    private Integer ageMin;


    @Column(name = "age_max")
    private Integer ageMax;


    // =========================================================
    // DESCRIPTION
    // =========================================================
    @Column(columnDefinition = "TEXT")
    private String description = "";


    // =========================================================
    // FICHIERS
    // =========================================================
    @OneToMany(
            mappedBy = "event",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @JsonManagedReference
    private List<EventFile> files =
            new ArrayList<>();


    // =========================================================
    // PARTICIPANTS
    // =========================================================
    @OneToMany(
            mappedBy = "event",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @JsonManagedReference("event_participants")
    private List<EventParticipant> participants =
            new ArrayList<>();


    // =========================================================
    // MONTANT ÉGAL
    // =========================================================
    @Column(
            name = "montant_egal",
            precision = 14,
            scale = 2
    )
    private BigDecimal montantEgal =
            BigDecimal.ZERO;


    // =========================================================
    // MONTANTS PAR DEGRÉ
    //
    // clé 1 = degré 1
    // clé 2 = degré 2
    // clé 3 = degré 3
    // clé 0 = degré non défini / معوز
    // =========================================================
    @ElementCollection
    @CollectionTable(
            name = "event_montants_degre",
            joinColumns = @JoinColumn(name = "event_id")
    )
    @MapKeyColumn(name = "degre")
    @Column(
            name = "montant",
            precision = 14,
            scale = 2
    )
    private Map<Integer, BigDecimal> montantsParDegre =
            new HashMap<>();


    // =========================================================
    // TYPE DE L'ÉVÉNEMENT
    // =========================================================
    @ManyToOne
    @JoinColumn(
            name = "event_type_id",
            nullable = false
    )
    private EventType eventType;


    // =========================================================
    // GETTERS / SETTERS
    // =========================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }


    // =========================================================
    // ANNÉE SCOLAIRE
    // =========================================================

    public String getAnneeScolaire() {
        return anneeScolaire;
    }

    public void setAnneeScolaire(
            String anneeScolaire
    ) {
        this.anneeScolaire =
                anneeScolaire;
    }


    // =========================================================
    // DEGRÉS
    // =========================================================

    public List<Integer> getDegresFamille() {
        return degresFamille;
    }

    public void setDegresFamille(
            List<Integer> degresFamille
    ) {

        this.degresFamille =
                degresFamille != null
                        ? degresFamille
                        : new ArrayList<>();
    }


    // =========================================================
    // TITRE
    // =========================================================

    public String getTitle() {
        return title;
    }

    public void setTitle(
            String title
    ) {
        this.title = title;
    }


    // =========================================================
    // DATES
    // =========================================================

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(
            LocalDate startDate
    ) {
        this.startDate =
                startDate;
    }


    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(
            LocalDate endDate
    ) {
        this.endDate =
                endDate;
    }


    // =========================================================
    // PLACE
    // =========================================================

    public String getPlace() {
        return place;
    }

    public void setPlace(
            String place
    ) {
        this.place =
                place;
    }


    // =========================================================
    // سواعد الخير
    // =========================================================

    public EconomicCategory getCaisse() {
        return caisse;
    }

    public void setCaisse(
            EconomicCategory caisse
    ) {
        this.caisse = caisse;
    }

    public Boolean getSawaedAlKhayr() {
        return sawaedAlKhayr;
    }

    public void setSawaedAlKhayr(
            Boolean sawaedAlKhayr
    ) {

        this.sawaedAlKhayr =
                sawaedAlKhayr != null
                        ? sawaedAlKhayr
                        : false;
    }


    // =========================================================
    // TYPE MONTANT
    // =========================================================

    public String getTypeMontant() {
        return typeMontant;
    }

    public void setTypeMontant(
            String typeMontant
    ) {
        this.typeMontant =
                typeMontant;
    }


    // =========================================================
    // MODE RÉPARTITION
    // =========================================================

    public String getModeRepartition() {
        return modeRepartition;
    }

    public void setModeRepartition(
            String modeRepartition
    ) {
        this.modeRepartition =
                modeRepartition;
    }


    // =========================================================
    // MONTANT GLOBAL
    // =========================================================

    public BigDecimal getMontantGlobal() {
        return montantGlobal;
    }

    public void setMontantGlobal(
            BigDecimal montantGlobal
    ) {

        this.montantGlobal =
                montantGlobal != null
                        ? montantGlobal
                        : BigDecimal.ZERO;
    }


    // =========================================================
    // MONTANT TOTAL
    // =========================================================

    public BigDecimal getMontantTotal() {
        return montantTotal;
    }

    public void setMontantTotal(
            BigDecimal montantTotal
    ) {

        this.montantTotal =
                montantTotal != null
                        ? montantTotal
                        : BigDecimal.ZERO;
    }


    // =========================================================
    // MONTANT ÉGAL
    // =========================================================

    public BigDecimal getMontantEgal() {
        return montantEgal;
    }

    public void setMontantEgal(
            BigDecimal montantEgal
    ) {

        this.montantEgal =
                montantEgal != null
                        ? montantEgal
                        : BigDecimal.ZERO;
    }


    // =========================================================
    // MONTANTS PAR DEGRÉ
    // =========================================================

    public Map<Integer, BigDecimal> getMontantsParDegre() {
        return montantsParDegre;
    }

    public void setMontantsParDegre(
            Map<Integer, BigDecimal> montantsParDegre
    ) {

        this.montantsParDegre =
                montantsParDegre != null
                        ? montantsParDegre
                        : new HashMap<>();
    }


    // =========================================================
    // CHARGE SUPPLÉMENTAIRE
    // =========================================================

    public BigDecimal getChargeSupplementaire() {
        return chargeSupplementaire;
    }

    public void setChargeSupplementaire(
            BigDecimal chargeSupplementaire
    ) {

        this.chargeSupplementaire =
                chargeSupplementaire != null
                        ? chargeSupplementaire
                        : BigDecimal.ZERO;
    }


    public String getChargeSupplementaireLabel() {
        return chargeSupplementaireLabel;
    }

    public void setChargeSupplementaireLabel(
            String chargeSupplementaireLabel
    ) {

        this.chargeSupplementaireLabel =
                chargeSupplementaireLabel;
    }


    // =========================================================
    // CIBLES
    // =========================================================

    @JsonProperty("cible")
    public List<Cible> getCibles() {
        return cibles;
    }

    public void setCibles(
            List<Cible> cibles
    ) {

        this.cibles =
                cibles != null
                        ? cibles
                        : new ArrayList<>();
    }


    // =========================================================
    // CALENDAR LEVEL
    // =========================================================

    public String getCalendarLevel() {
        return calendarLevel;
    }

    public void setCalendarLevel(
            String calendarLevel
    ) {

        this.calendarLevel =
                calendarLevel;
    }


    // =========================================================
    // ÂGE
    // =========================================================

    public Integer getAgeMin() {
        return ageMin;
    }

    public void setAgeMin(
            Integer ageMin
    ) {

        this.ageMin =
                ageMin;
    }


    public Integer getAgeMax() {
        return ageMax;
    }

    public void setAgeMax(
            Integer ageMax
    ) {

        this.ageMax =
                ageMax;
    }


    // =========================================================
    // DESCRIPTION
    // =========================================================

    public String getDescription() {
        return description;
    }

    public void setDescription(
            String description
    ) {

        this.description =
                description != null
                        ? description
                        : "";
    }


    // =========================================================
    // FILES
    // =========================================================

    public List<EventFile> getFiles() {
        return files;
    }

    public void setFiles(
            List<EventFile> files
    ) {

        this.files =
                files != null
                        ? files
                        : new ArrayList<>();
    }


    // =========================================================
    // EVENT TYPE
    // =========================================================

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(
            EventType eventType
    ) {

        this.eventType =
                eventType;
    }


    // =========================================================
    // PARTICIPANTS
    // =========================================================

    public List<EventParticipant> getParticipants() {
        return participants;
    }

    public void setParticipants(
            List<EventParticipant> participants
    ) {

        this.participants =
                participants != null
                        ? participants
                        : new ArrayList<>();
    }


    // =========================================================
    // PARTICIPANTS : MÈRES
    // =========================================================

    public List<EventParticipant> getMereParticipants() {

        return participants
                .stream()
                .filter(
                        p ->
                                p.getParticipantType()
                                        == ParticipantType.MERE
                )
                .toList();
    }


    // =========================================================
    // PARTICIPANTS : ENFANTS
    // =========================================================

    public List<EventParticipant> getEnfantParticipants() {

        return participants
                .stream()
                .filter(
                        p ->
                                p.getParticipantType()
                                        == ParticipantType.ENFANT
                )
                .toList();
    }


    // =========================================================
    // PARTICIPANTS : FAMILLES
    // =========================================================

    public List<EventParticipant> getFamilleParticipants() {

        return participants
                .stream()
                .filter(
                        p ->
                                p.getParticipantType()
                                        == ParticipantType.FAMILLE
                )
                .toList();
    }


    // =========================================================
    // SET MÈRES PARTICIPANTES
    // =========================================================

    public void setMereParticipants(
            List<Mere> meres
    ) {

        participants.removeIf(
                p ->
                        p.getParticipantType()
                                == ParticipantType.MERE
        );


        if (meres == null) {
            return;
        }


        for (Mere mere : meres) {

            EventParticipant participant =
                    new EventParticipant();


            participant.setParticipantType(
                    ParticipantType.MERE
            );


            participant.setMere(
                    mere
            );


            participant.setEvent(
                    this
            );


            participants.add(
                    participant
            );
        }
    }


    // =========================================================
    // SET ENFANTS PARTICIPANTS
    // =========================================================

    public void setEnfantsParticipants(
            List<Enfant> enfants
    ) {

        participants.removeIf(
                p ->
                        p.getParticipantType()
                                == ParticipantType.ENFANT
        );


        if (enfants == null) {
            return;
        }


        for (Enfant enfant : enfants) {

            EventParticipant participant =
                    new EventParticipant();


            participant.setParticipantType(
                    ParticipantType.ENFANT
            );


            participant.setEnfant(
                    enfant
            );


            participant.setEvent(
                    this
            );


            participants.add(
                    participant
            );
        }
    }


    // =========================================================
    // SET FAMILLES PARTICIPANTES
    // =========================================================

    public void setFamilleParticipants(
            List<Famille> familles
    ) {

        participants.removeIf(
                p ->
                        p.getParticipantType()
                                == ParticipantType.FAMILLE
        );


        if (familles == null) {
            return;
        }


        for (Famille famille : familles) {

            EventParticipant participant =
                    new EventParticipant();


            participant.setParticipantType(
                    ParticipantType.FAMILLE
            );


            participant.setFamille(
                    famille
            );


            participant.setEvent(
                    this
            );


            participants.add(
                    participant
            );
        }
    }
}