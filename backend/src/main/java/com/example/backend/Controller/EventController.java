package com.example.backend.Controller;

import com.example.backend.Repository.EventTypeRepository;
import com.example.backend.model.*;
import com.example.backend.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(
        origins = "http://localhost:3000",
        allowCredentials = "true"
)
public class EventController {

    private final EventService eventService;
    private final EventTypeRepository eventTypeRepository;


    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    public EventController(
            EventService eventService,
            EventTypeRepository eventTypeRepository
    ) {
        this.eventService = eventService;
        this.eventTypeRepository = eventTypeRepository;
    }


    // ============================================================
    // GET ALL EVENTS
    // ============================================================

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllEvents() {

        List<Event> events =
                eventService.getAllEvents();

        List<Map<String, Object>> result =
                events.stream()
                        .map(this::serializeBasicEvent)
                        .toList();

        return ResponseEntity.ok(result);
    }


    // ============================================================
    // EVENT TYPES
    // ============================================================

    @GetMapping("/event-types")
    public List<EventType> getEventTypes() {

        String[] defaultTypes = {
                "اقتصادي",
                "ترفيهي",
                "تربوي",
                "صحي"
        };

        List<EventType> existing =
                eventTypeRepository.findAll();

        for (String name : defaultTypes) {

            boolean found =
                    existing.stream()
                            .anyMatch(
                                    type ->
                                            name.equals(
                                                    type.getName()
                                            )
                            );

            if (!found) {

                EventType type =
                        new EventType();

                type.setName(name);

                eventTypeRepository.save(type);
            }
        }

        return eventTypeRepository.findAll()
                .stream()
                .filter(
                        type ->
                                "اقتصادي".equals(type.getName())
                                        || "ترفيهي".equals(type.getName())
                                        || "تربوي".equals(type.getName())
                                        || "صحي".equals(type.getName())
                )
                .toList();
    }


    // ============================================================
    // CREATE EVENT
    // ============================================================

    @PostMapping
    public ResponseEntity<Event> createEvent(
            @RequestBody Map<String, Object> payload
    ) {

        try {

            Event event =
                    new Event();


            // ----------------------------------------------------
            // TITLE
            // ----------------------------------------------------

            String title =
                    stringValue(
                            payload.get("title")
                    );

            if (title == null || title.isBlank()) {

                throw new RuntimeException(
                        "Title is required"
                );
            }

            event.setTitle(
                    title.trim()
            );


            // ----------------------------------------------------
            // DATES
            // ----------------------------------------------------

            String startStr =
                    stringValue(
                            payload.get("start")
                    );

            String endStr =
                    stringValue(
                            payload.get("end")
                    );

            if (startStr == null || startStr.isBlank()) {

                throw new RuntimeException(
                        "Start date is required"
                );
            }

            if (endStr == null || endStr.isBlank()) {

                throw new RuntimeException(
                        "End date is required"
                );
            }

            event.setStartDate(
                    LocalDate.parse(
                            startStr.trim()
                    )
            );

            event.setEndDate(
                    LocalDate.parse(
                            endStr.trim()
                    )
            );


            // ----------------------------------------------------
            // EXTENDED PROPS
            // ----------------------------------------------------

            Map<String, Object> props =
                    getMap(
                            payload.get(
                                    "extendedProps"
                            )
                    );

            if (props == null) {

                throw new RuntimeException(
                        "Extended properties are required"
                );
            }


            // ----------------------------------------------------
            // CALENDAR LEVEL
            // ----------------------------------------------------

            String calendarLevel =
                    stringValue(
                            props.get(
                                    "calendarLevel"
                            )
                    );

            event.setCalendarLevel(
                    calendarLevel != null
                            && !calendarLevel.isBlank()
                            ? calendarLevel
                            : "PRIMARY"
            );


            // ----------------------------------------------------
            // CIBLES
            // ----------------------------------------------------

            List<Cible> cibles =
                    parseCibles(
                            props.get("cibles")
                    );

            if (cibles.isEmpty()) {

                throw new RuntimeException(
                        "Cibles are required"
                );
            }

            event.setCibles(cibles);


            // ----------------------------------------------------
            // DEGRES
            //
            // 1 = degré 1
            // 2 = degré 2
            // 3 = degré 3
            // 0 = degré NON défini
            // ----------------------------------------------------

            List<Integer> degresFamille =
                    parseIntegerList(
                            props.get(
                                    "degresFamille"
                            )
                    );

            event.setDegresFamille(
                    degresFamille
            );


            // ----------------------------------------------------
            // AGE
            // ----------------------------------------------------

            if (
                    cibles.contains(
                            Cible.ENFANT
                    )
            ) {

                event.setAgeMin(
                        integerValue(
                                props.get(
                                        "ageMin"
                                )
                        )
                );

                event.setAgeMax(
                        integerValue(
                                props.get(
                                        "ageMax"
                                )
                        )
                );

            } else {

                event.setAgeMin(null);
                event.setAgeMax(null);
            }


            // ----------------------------------------------------
            // EVENT TYPE
            // ----------------------------------------------------

            Map<String, Object> typeMap =
                    getMap(
                            props.get(
                                    "eventType"
                            )
                    );

            if (
                    typeMap == null
                            || typeMap.get("id") == null
            ) {

                throw new RuntimeException(
                        "Event type is required"
                );
            }

            Long typeId =
                    Long.valueOf(
                            typeMap
                                    .get("id")
                                    .toString()
                    );

            EventType eventType =
                    eventTypeRepository
                            .findById(typeId)
                            .orElseThrow(
                                    () ->
                                            new RuntimeException(
                                                    "Event type not found"
                                            )
                            );

            event.setEventType(
                    eventType
            );


            // ----------------------------------------------------
            // DESCRIPTION
            // ----------------------------------------------------

            String description =
                    stringValue(
                            props.get(
                                    "description"
                            )
                    );

            event.setDescription(
                    description != null
                            ? description.trim()
                            : ""
            );


            // ----------------------------------------------------
            // PLACE
            // ----------------------------------------------------

            String place =
                    stringValue(
                            props.get("place")
                    );

            if (place == null || place.isBlank()) {

                throw new RuntimeException(
                        "Place is required"
                );
            }

            event.setPlace(
                    place.trim()
            );


            // ----------------------------------------------------
            // ANNÉE SCOLAIRE
            // ----------------------------------------------------

            String anneeScolaire =
                    stringValue(
                            props.get(
                                    "anneeScolaire"
                            )
                    );

            if (
                    anneeScolaire == null
                            || anneeScolaire.isBlank()
            ) {

                throw new RuntimeException(
                        "Annee scolaire is required"
                );
            }

            event.setAnneeScolaire(
                    validateAnneeScolaire(
                            anneeScolaire
                    )
            );


            // ----------------------------------------------------
            // سواعد الخير
            // ----------------------------------------------------

            event.setSawaedAlKhayr(
                    booleanValue(
                            props.get("sawaedAlKhayr"),
                            false
                    )
            );


            // ----------------------------------------------------
            // FILES
            // ----------------------------------------------------

            if (
                    props.containsKey(
                            "files"
                    )
            ) {

                event.setFiles(
                        buildFiles(
                                props.get(
                                        "files"
                                ),
                                event
                        )
                );
            }


            // ----------------------------------------------------
            // INITIAL FINANCIAL VALUES
            // ----------------------------------------------------

            event.setTypeMontant(
                    "GLOBAL"
            );

            event.setModeRepartition(
                    null
            );

            event.setMontantGlobal(
                    BigDecimal.ZERO
            );

            event.setMontantEgal(
                    BigDecimal.ZERO
            );

            event.setMontantTotal(
                    BigDecimal.ZERO
            );

            event.setMontantsParDegre(
                    new HashMap<>()
            );

            event.setChargeSupplementaire(
                    BigDecimal.ZERO
            );


            // ----------------------------------------------------
            // PARTICIPANTS AUTOMATIQUES
            // ----------------------------------------------------

            List<EventParticipant> participants =
                    buildEligibleParticipants(
                            event,
                            new ArrayList<>()
                    );

            event.setParticipants(
                    participants
            );


            Event saved =
                    eventService.saveEvent(
                            event
                    );

            return ResponseEntity.ok(
                    saved
            );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(500)
                    .body(null);
        }
    }


    // ============================================================
    // STATS
    // ============================================================

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestParam(required = false)
            String anneeScolaire,

            @RequestParam(required = false)
            Integer year
    ) {

        List<Event> events =
                eventService
                        .getAllEvents()
                        .stream()
                        .filter(
                                event ->
                                        matchesAnneeScolaire(
                                                event,
                                                anneeScolaire,
                                                year
                                        )
                        )
                        .toList();


        Map<Long, Map<String, Object>> byType =
                new LinkedHashMap<>();


        BigDecimal totalDegresDefinis =
                BigDecimal.ZERO;

        BigDecimal totalMouawiz =
                BigDecimal.ZERO;

        BigDecimal totalSawaedAlKhayr =
                BigDecimal.ZERO;

        BigDecimal totalNonVentile =
                BigDecimal.ZERO;


        for (Event event : events) {

            Long typeId =
                    event.getEventType() != null
                            ? event.getEventType().getId()
                            : 0L;

            String typeName =
                    event.getEventType() != null
                            ? event.getEventType().getName()
                            : "غير محدد";


            MontantsCategories montants =
                    calculerMontantsCategories(event);


            Map<String, Object> row =
                    byType.computeIfAbsent(
                            typeId,
                            key -> {

                                Map<String, Object> map =
                                        new HashMap<>();

                                map.put("typeId", typeId);
                                map.put("typeName", typeName);
                                map.put("count", 0);
                                map.put("montantDegresDefinis", BigDecimal.ZERO);
                                map.put("montantMouawiz", BigDecimal.ZERO);
                                map.put("montantSawaedAlKhayr", BigDecimal.ZERO);
                                map.put("montantNonVentile", BigDecimal.ZERO);

                                return map;
                            }
                    );


            row.put(
                    "count",
                    (Integer) row.get("count") + 1
            );

            row.put(
                    "montantDegresDefinis",
                    ((BigDecimal) row.get("montantDegresDefinis"))
                            .add(montants.degresDefinis())
            );

            row.put(
                    "montantMouawiz",
                    ((BigDecimal) row.get("montantMouawiz"))
                            .add(montants.mouawiz())
            );

            row.put(
                    "montantSawaedAlKhayr",
                    ((BigDecimal) row.get("montantSawaedAlKhayr"))
                            .add(montants.sawaedAlKhayr())
            );

            row.put(
                    "montantNonVentile",
                    ((BigDecimal) row.get("montantNonVentile"))
                            .add(montants.nonVentile())
            );


            totalDegresDefinis =
                    totalDegresDefinis.add(
                            montants.degresDefinis()
                    );

            totalMouawiz =
                    totalMouawiz.add(
                            montants.mouawiz()
                    );

            totalSawaedAlKhayr =
                    totalSawaedAlKhayr.add(
                            montants.sawaedAlKhayr()
                    );

            totalNonVentile =
                    totalNonVentile.add(
                            montants.nonVentile()
                    );
        }


        Map<String, Object> result =
                new HashMap<>();

        result.put("anneeScolaire", anneeScolaire);
        result.put("year", year);
        result.put("totalEvents", events.size());

        // IMPORTANT : trois caisses séparées.
        // On ne renvoie pas de "totalMontant" mélangé pour l'affichage.
        result.put("totalMontantDegresDefinis", totalDegresDefinis);
        result.put("totalMontantMouawiz", totalMouawiz);
        result.put("totalMontantSawaedAlKhayr", totalSawaedAlKhayr);

        // Seulement pour les cas impossibles à ventiler honnêtement
        // (ex. montant GLOBAL sur un événement mélangeant les deux catégories,
        // ou charge supplémentaire d'un événement normal distribué).
        result.put("totalMontantNonVentile", totalNonVentile);

        result.put(
                "types",
                new ArrayList<>(
                        byType.values()
                )
        );


        return ResponseEntity.ok(result);
    }


    // ============================================================
    // GET EVENT BY ID
    // ============================================================

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getEventById(
            @PathVariable Long id
    ) {

        return eventService
                .getEventById(id)
                .map(
                        event -> {

                            Map<String, Object> map =
                                    new HashMap<>();


                            // ------------------------------------
                            // BASIC INFOS
                            // ------------------------------------

                            map.put(
                                    "id",
                                    event.getId()
                            );

                            map.put(
                                    "title",
                                    event.getTitle()
                            );

                            map.put(
                                    "startDate",
                                    event.getStartDate()
                            );

                            map.put(
                                    "endDate",
                                    event.getEndDate()
                            );

                            map.put(
                                    "calendar",
                                    event.getCalendarLevel()
                            );

                            map.put(
                                    "place",
                                    event.getPlace()
                            );

                            map.put(
                                    "ageMin",
                                    event.getAgeMin()
                            );

                            map.put(
                                    "ageMax",
                                    event.getAgeMax()
                            );

                            map.put(
                                    "anneeScolaire",
                                    event.getAnneeScolaire()
                            );

                            map.put(
                                    "sawaedAlKhayr",
                                    Boolean.TRUE.equals(event.getSawaedAlKhayr())
                            );

                            map.put(
                                    "description",
                                    event.getDescription()
                            );


                            // ------------------------------------
                            // FINANCIAL
                            // ------------------------------------

                            map.put(
                                    "montantTotal",
                                    safeBigDecimal(
                                            event.getMontantTotal()
                                    )
                            );

                            map.put(
                                    "typeMontant",
                                    event.getTypeMontant()
                            );

                            map.put(
                                    "modeRepartition",
                                    event.getModeRepartition()
                            );

                            map.put(
                                    "montantGlobal",
                                    safeBigDecimal(
                                            event.getMontantGlobal()
                                    )
                            );

                            map.put(
                                    "montantEgal",
                                    safeBigDecimal(
                                            event.getMontantEgal()
                                    )
                            );

                            map.put(
                                    "montantsParDegre",

                                    event.getMontantsParDegre()
                                            != null

                                            ? event.getMontantsParDegre()

                                            : new HashMap<>()
                            );

                            MontantsCategories categories =
                                    calculerMontantsCategories(event);

                            map.put(
                                    "montantDegresDefinis",
                                    categories.degresDefinis()
                            );

                            map.put(
                                    "montantMouawiz",
                                    categories.mouawiz()
                            );

                            map.put(
                                    "montantSawaedAlKhayr",
                                    categories.sawaedAlKhayr()
                            );

                            map.put(
                                    "montantNonVentile",
                                    categories.nonVentile()
                            );

                            map.put(
                                    "chargeSupplementaire",

                                    safeBigDecimal(
                                            event.getChargeSupplementaire()
                                    )
                            );

                            map.put(
                                    "chargeSupplementaireLabel",
                                    event.getChargeSupplementaireLabel()
                            );


                            // ------------------------------------
                            // DEGRES / CIBLES
                            // ------------------------------------

                            map.put(
                                    "degresFamille",

                                    event.getDegresFamille()
                                            != null

                                            ? event.getDegresFamille()

                                            : new ArrayList<>()
                            );

                            map.put(
                                    "cibles",

                                    event.getCibles()
                                            != null

                                            ? event
                                            .getCibles()
                                            .stream()
                                            .map(
                                                    Enum::name
                                            )
                                            .collect(
                                                    Collectors
                                                            .toList()
                                            )

                                            : new ArrayList<>()
                            );


                            // ------------------------------------
                            // EVENT TYPE
                            // ------------------------------------

                            if (
                                    event.getEventType()
                                            != null
                            ) {

                                Map<String, Object> typeMap =
                                        new HashMap<>();

                                typeMap.put(
                                        "id",
                                        event
                                                .getEventType()
                                                .getId()
                                );

                                typeMap.put(
                                        "name",
                                        event
                                                .getEventType()
                                                .getName()
                                );

                                map.put(
                                        "eventType",
                                        typeMap
                                );

                            } else {

                                map.put(
                                        "eventType",
                                        null
                                );
                            }


                            // ------------------------------------
                            // FILES
                            // ------------------------------------

                            List<Map<String, Object>> photos =
                                    new ArrayList<>();

                            if (
                                    event.getFiles()
                                            != null
                            ) {

                                for (
                                        EventFile file :
                                        event.getFiles()
                                ) {

                                    Map<String, Object> fileMap =
                                            new HashMap<>();

                                    fileMap.put(
                                            "base64",
                                            file.getBase64()
                                    );

                                    fileMap.put(
                                            "type",
                                            file.getType()
                                    );

                                    fileMap.put(
                                            "name",
                                            file.getName()
                                    );

                                    photos.add(
                                            fileMap
                                    );
                                }
                            }

                            map.put(
                                    "photos",
                                    photos
                            );


                            // ------------------------------------
                            // RELATION FAMILLES
                            // ------------------------------------

                            List<Famille> familles =
                                    eventService
                                            .getAllFamilles();


                            Map<Long, Famille> familleParMere =
                                    new HashMap<>();

                            Map<Long, Famille> familleParEnfant =
                                    new HashMap<>();


                            for (
                                    Famille famille :
                                    familles
                            ) {

                                if (
                                        famille.getMere()
                                                != null
                                ) {

                                    familleParMere.put(
                                            famille
                                                    .getMere()
                                                    .getId(),

                                            famille
                                    );
                                }


                                if (
                                        famille.getEnfants()
                                                != null
                                ) {

                                    for (
                                            Enfant enfant :
                                            famille.getEnfants()
                                    ) {

                                        familleParEnfant.put(
                                                enfant.getId(),
                                                famille
                                        );
                                    }
                                }
                            }


                            // ------------------------------------
                            // MÈRES
                            // ------------------------------------

                            List<Map<String, Object>> meres =
                                    new ArrayList<>();


                            for (
                                    EventParticipant participant :
                                    safeParticipants(
                                            event
                                    )
                            ) {

                                if (
                                        participant.getParticipantType()
                                                != ParticipantType.MERE
                                                || participant.getMere()
                                                == null
                                ) {

                                    continue;
                                }


                                Mere mere =
                                        participant.getMere();


                                Famille famille =
                                        familleParMere.get(
                                                mere.getId()
                                        );


                                Map<String, Object> participantMap =
                                        new HashMap<>();


                                participantMap.put(
                                        "id",
                                        mere.getId()
                                );

                                participantMap.put(
                                        "nom",
                                        mere.getNom()
                                );

                                participantMap.put(
                                        "prenom",
                                        mere.getPrenom()
                                );

                                participantMap.put(
                                        "degreFamille",

                                        famille != null

                                                ? famille
                                                .getDegreFamille()

                                                : null
                                );

                                participantMap.put(
                                        "nomFamilleEnfants",

                                        famille != null
                                                && famille.getPere()
                                                != null

                                                ? famille
                                                .getPere()
                                                .getNom()

                                                : null
                                );

                                participantMap.put(
                                        "present",
                                        participant.getPresent()
                                );

                                participantMap.put(
                                        "motif",
                                        participant
                                                .getAbsenceReason()
                                );

                                participantMap.put(
                                        "montant",

                                        safeBigDecimal(
                                                participant.getMontant()
                                        )
                                );


                                meres.add(
                                        participantMap
                                );
                            }


                            map.put(
                                    "meresParticipants",
                                    meres
                            );


                            // ------------------------------------
                            // ENFANTS
                            // ------------------------------------

                            List<Map<String, Object>> enfants =
                                    new ArrayList<>();


                            for (
                                    EventParticipant participant :
                                    safeParticipants(
                                            event
                                    )
                            ) {

                                if (
                                        participant.getParticipantType()
                                                != ParticipantType.ENFANT
                                                || participant.getEnfant()
                                                == null
                                ) {

                                    continue;
                                }


                                Enfant enfant =
                                        participant.getEnfant();


                                Famille famille =
                                        familleParEnfant.get(
                                                enfant.getId()
                                        );


                                Map<String, Object> participantMap =
                                        new HashMap<>();


                                participantMap.put(
                                        "id",
                                        enfant.getId()
                                );

                                participantMap.put(
                                        "nom",
                                        enfant.getNom()
                                );

                                participantMap.put(
                                        "prenom",
                                        enfant.getPrenom()
                                );

                                participantMap.put(
                                        "age",
                                        enfant.getAge()
                                );

                                participantMap.put(
                                        "degreFamille",

                                        famille != null

                                                ? famille
                                                .getDegreFamille()

                                                : null
                                );

                                participantMap.put(
                                        "present",
                                        participant.getPresent()
                                );

                                participantMap.put(
                                        "motif",
                                        participant
                                                .getAbsenceReason()
                                );

                                participantMap.put(
                                        "montant",

                                        safeBigDecimal(
                                                participant.getMontant()
                                        )
                                );


                                enfants.add(
                                        participantMap
                                );
                            }


                            map.put(
                                    "enfantsParticipants",
                                    enfants
                            );


                            // ------------------------------------
                            // FAMILLES
                            // ------------------------------------

                            List<Map<String, Object>> famillesParticipants =
                                    new ArrayList<>();


                            for (
                                    EventParticipant participant :
                                    safeParticipants(
                                            event
                                    )
                            ) {

                                if (
                                        participant.getParticipantType()
                                                != ParticipantType.FAMILLE
                                                || participant.getFamille()
                                                == null
                                ) {

                                    continue;
                                }


                                Famille famille =
                                        participant.getFamille();


                                Map<String, Object> participantMap =
                                        new HashMap<>();


                                participantMap.put(
                                        "id",
                                        famille.getId()
                                );

                                /*
                                 * null côté Java
                                 * = "غير محدد"
                                 * côté frontend.
                                 */
                                participantMap.put(
                                        "degreFamille",
                                        famille.getDegreFamille()
                                );


                                Map<String, Object> pereMap =
                                        new HashMap<>();


                                pereMap.put(
                                        "nom",

                                        famille.getPere()
                                                != null

                                                ? famille
                                                .getPere()
                                                .getNom()

                                                : ""
                                );

                                pereMap.put(
                                        "prenom",

                                        famille.getPere()
                                                != null

                                                ? famille
                                                .getPere()
                                                .getPrenom()

                                                : ""
                                );


                                participantMap.put(
                                        "pere",
                                        pereMap
                                );

                                participantMap.put(
                                        "present",
                                        participant.getPresent()
                                );

                                participantMap.put(
                                        "motif",
                                        participant
                                                .getAbsenceReason()
                                );

                                participantMap.put(
                                        "montant",

                                        safeBigDecimal(
                                                participant.getMontant()
                                        )
                                );


                                famillesParticipants.add(
                                        participantMap
                                );
                            }


                            map.put(
                                    "famillesParticipants",
                                    famillesParticipants
                            );


                            return ResponseEntity.ok(
                                    map
                            );
                        }
                )
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }


    // ============================================================
    // DELETE EVENT
    // ============================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long id
    ) {

        eventService.deleteEvent(
                id
        );

        return ResponseEntity
                .noContent()
                .build();
    }


    // ============================================================
    // UPDATE BASIC EVENT INFO
    //
    // Utilisé depuis Calendar
    // ET depuis EventDetails
    //
    // Si cibles / âge / degrés changent :
    // on recalcule automatiquement les participants.
    // ============================================================

    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {

        try {

            Event event =
                    eventService
                            .getEventById(id)
                            .orElseThrow(
                                    () ->
                                            new RuntimeException(
                                                    "Event not found"
                                            )
                            );


            /*
             * On garde une copie des participants
             * AVANT le recalcul.
             *
             * Cela permet de conserver :
             * - présence
             * - motif
             * pour les participants qui restent éligibles.
             */
            List<EventParticipant> oldParticipants =
                    new ArrayList<>(
                            safeParticipants(
                                    event
                            )
                    );


            // ----------------------------------------------------
            // TITLE
            // ----------------------------------------------------

            String title =
                    stringValue(
                            payload.get("title")
                    );

            if (
                    title != null
                            && !title.isBlank()
            ) {

                event.setTitle(
                        title.trim()
                );
            }


            // ----------------------------------------------------
            // DATES
            // ----------------------------------------------------

            String startStr =
                    stringValue(
                            payload.get("start")
                    );

            String endStr =
                    stringValue(
                            payload.get("end")
                    );


            if (
                    startStr != null
                            && !startStr.isBlank()
            ) {

                event.setStartDate(
                        LocalDate.parse(
                                startStr.trim()
                        )
                );
            }


            if (
                    endStr != null
                            && !endStr.isBlank()
            ) {

                event.setEndDate(
                        LocalDate.parse(
                                endStr.trim()
                        )
                );
            }


            Map<String, Object> props =
                    getMap(
                            payload.get(
                                    "extendedProps"
                            )
                    );


            boolean rebuildParticipants =
                    false;


            if (props != null) {


                // ------------------------------------------------
                // CIBLES
                // ------------------------------------------------

                if (
                        props.containsKey(
                                "cibles"
                        )
                ) {

                    List<Cible> cibles =
                            parseCibles(
                                    props.get(
                                            "cibles"
                                    )
                            );

                    if (cibles.isEmpty()) {

                        throw new RuntimeException(
                                "At least one cible is required"
                        );
                    }

                    event.setCibles(
                            cibles
                    );

                    rebuildParticipants =
                            true;
                }


                // ------------------------------------------------
                // DEGRES
                // ------------------------------------------------

                if (
                        props.containsKey(
                                "degresFamille"
                        )
                ) {

                    event.setDegresFamille(

                            parseIntegerList(
                                    props.get(
                                            "degresFamille"
                                    )
                            )
                    );

                    rebuildParticipants =
                            true;
                }


                // ------------------------------------------------
                // AGE
                // ------------------------------------------------

                if (
                        event.getCibles()
                                != null
                                && event
                                .getCibles()
                                .contains(
                                        Cible.ENFANT
                                )
                ) {

                    if (
                            props.containsKey(
                                    "ageMin"
                            )
                    ) {

                        event.setAgeMin(
                                integerValue(
                                        props.get(
                                                "ageMin"
                                        )
                                )
                        );

                        rebuildParticipants =
                                true;
                    }


                    if (
                            props.containsKey(
                                    "ageMax"
                            )
                    ) {

                        event.setAgeMax(
                                integerValue(
                                        props.get(
                                                "ageMax"
                                        )
                                )
                        );

                        rebuildParticipants =
                                true;
                    }

                } else {

                    event.setAgeMin(
                            null
                    );

                    event.setAgeMax(
                            null
                    );
                }


                // ------------------------------------------------
                // EVENT TYPE
                // ------------------------------------------------

                Map<String, Object> typeMap =
                        getMap(
                                props.get(
                                        "eventType"
                                )
                        );

                if (
                        typeMap != null
                                && typeMap.get("id")
                                != null
                ) {

                    Long typeId =
                            Long.valueOf(
                                    typeMap
                                            .get("id")
                                            .toString()
                            );

                    EventType eventType =
                            eventTypeRepository
                                    .findById(
                                            typeId
                                    )
                                    .orElseThrow(
                                            () ->
                                                    new RuntimeException(
                                                            "Event type not found"
                                                    )
                                    );

                    event.setEventType(
                            eventType
                    );
                }


                // ------------------------------------------------
                // PLACE
                // ------------------------------------------------

                String place =
                        stringValue(
                                props.get(
                                        "place"
                                )
                        );

                if (
                        place != null
                                && !place.isBlank()
                ) {

                    event.setPlace(
                            place.trim()
                    );
                }


                // ------------------------------------------------
                // ANNÉE SCOLAIRE
                // ------------------------------------------------

                String anneeScolaire =
                        stringValue(
                                props.get(
                                        "anneeScolaire"
                                )
                        );

                if (
                        anneeScolaire != null
                                && !anneeScolaire.isBlank()
                ) {

                    event.setAnneeScolaire(

                            validateAnneeScolaire(
                                    anneeScolaire
                            )
                    );
                }


                // ------------------------------------------------
                // سواعد الخير
                // ------------------------------------------------

                if (
                        props.containsKey(
                                "sawaedAlKhayr"
                        )
                ) {

                    event.setSawaedAlKhayr(
                            booleanValue(
                                    props.get("sawaedAlKhayr"),
                                    false
                            )
                    );
                }


                // ------------------------------------------------
                // DESCRIPTION
                // ------------------------------------------------

                if (
                        props.containsKey(
                                "description"
                        )
                ) {

                    String description =
                            stringValue(
                                    props.get(
                                            "description"
                                    )
                            );

                    event.setDescription(
                            description != null
                                    ? description.trim()
                                    : ""
                    );
                }
            }


            // ----------------------------------------------------
            // REBUILD AUTOMATIC PARTICIPANTS
            // ----------------------------------------------------

            if (
                    rebuildParticipants
            ) {

                List<EventParticipant> newParticipants =
                        buildEligibleParticipants(
                                event,
                                oldParticipants
                        );


                event.getParticipants()
                        .clear();


                event.getParticipants()
                        .addAll(
                                newParticipants
                        );


                recalculateMontantTotal(
                        event
                );
            }


            Event saved =
                    eventService.saveEvent(
                            event
                    );


            return ResponseEntity.ok(
                    saved
            );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(500)
                    .body(null);
        }
    }


    // ============================================================
    // UPDATE EVENT DETAILS
    //
    // Description
    // Files
    // Participants
    // Présence
    // Motifs
    // Montants
    // ============================================================

    @PutMapping("/details/{id}")
    public ResponseEntity<Event> updateEventDetails(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {

        try {

            Event event =
                    eventService
                            .getEventById(id)
                            .orElseThrow(
                                    () ->
                                            new RuntimeException(
                                                    "Event not found"
                                            )
                            );


            Map<String, Object> props =
                    getMap(
                            payload.get(
                                    "extendedProps"
                            )
                    );


            if (
                    props == null
            ) {

                return ResponseEntity.ok(
                        event
                );
            }


            // ----------------------------------------------------
            // DESCRIPTION
            // ----------------------------------------------------

            if (
                    props.containsKey(
                            "description"
                    )
            ) {

                String description =
                        stringValue(
                                props.get(
                                        "description"
                                )
                        );

                event.setDescription(

                        description != null

                                ? description.trim()

                                : ""
                );
            }


            // ----------------------------------------------------
            // FILES
            // ----------------------------------------------------

            if (
                    props.containsKey(
                            "files"
                    )
            ) {

                if (
                        event.getFiles()
                                == null
                ) {

                    event.setFiles(
                            new ArrayList<>()
                    );
                }


                event.getFiles()
                        .clear();


                event.getFiles()
                        .addAll(

                                buildFiles(
                                        props.get(
                                                "files"
                                        ),
                                        event
                                )
                        );
            }


            // ====================================================
            // سواعد الخير
            // ====================================================

            if (
                    props.containsKey(
                            "sawaedAlKhayr"
                    )
            ) {

                event.setSawaedAlKhayr(
                        booleanValue(
                                props.get("sawaedAlKhayr"),
                                false
                        )
                );
            }


            // ====================================================
            // MONTANTS EVENT
            // ====================================================

            if (
                    props.containsKey(
                            "typeMontant"
                    )
            ) {

                String typeMontant =
                        stringValue(
                                props.get(
                                        "typeMontant"
                                )
                        );

                event.setTypeMontant(
                        typeMontant
                );
            }


            if (
                    props.containsKey(
                            "modeRepartition"
                    )
            ) {

                event.setModeRepartition(

                        stringValue(
                                props.get(
                                        "modeRepartition"
                                )
                        )
                );
            }


            if (
                    props.containsKey(
                            "montantGlobal"
                    )
            ) {

                event.setMontantGlobal(

                        decimalValue(
                                props.get(
                                        "montantGlobal"
                                )
                        )
                );
            }


            if (
                    props.containsKey(
                            "montantEgal"
                    )
            ) {

                event.setMontantEgal(

                        decimalValue(
                                props.get(
                                        "montantEgal"
                                )
                        )
                );
            }


            // ====================================================
            // MONTANTS PAR DEGRE
            //
            // clé 0 = degré non défini
            //
            // Exemple :
            // {
            //   1: 100,
            //   2: 80,
            //   3: 60,
            //   0: 40
            // }
            // ====================================================

            if (
                    props.containsKey(
                            "montantsParDegre"
                    )
            ) {

                Map<Integer, BigDecimal> montants =
                        parseMontantsParDegre(

                                props.get(
                                        "montantsParDegre"
                                )
                        );


                event.setMontantsParDegre(
                        montants
                );
            }


            // ----------------------------------------------------
            // CHARGE SUPPLEMENTAIRE
            // ----------------------------------------------------

            if (
                    props.containsKey(
                            "chargeSupplementaire"
                    )
            ) {

                event.setChargeSupplementaire(

                        decimalValue(
                                props.get(
                                        "chargeSupplementaire"
                                )
                        )
                );
            }


            if (
                    props.containsKey(
                            "chargeSupplementaireLabel"
                    )
            ) {

                event.setChargeSupplementaireLabel(

                        stringValue(
                                props.get(
                                        "chargeSupplementaireLabel"
                                )
                        )
                );
            }


            // ====================================================
            // PARTICIPANTS
            // ====================================================

            boolean participantsSent =

                    props.containsKey(
                            "meresParticipants"
                    )

                            ||

                            props.containsKey(
                                    "enfantsParticipants"
                            )

                            ||

                            props.containsKey(
                                    "famillesParticipants"
                            );


            if (
                    participantsSent
            ) {

                List<EventParticipant> newParticipants =
                        new ArrayList<>();


                // ================================================
                // MÈRES
                // ================================================

                List<Map<String, Object>> meres =
                        mapList(
                                props.get(
                                        "meresParticipants"
                                )
                        );


                for (
                        Map<String, Object> p :
                        meres
                ) {

                    if (
                            p.get("id")
                                    == null
                    ) {

                        continue;
                    }


                    EventParticipant participant =
                            new EventParticipant();


                    participant.setEvent(
                            event
                    );

                    participant.setParticipantType(
                            ParticipantType.MERE
                    );

                    participant.setMere(

                            eventService.getMereById(

                                    Long.valueOf(
                                            p.get("id")
                                                    .toString()
                                    )
                            )
                    );

                    participant.setPresent(

                            booleanValue(
                                    p.get("present"),
                                    true
                            )
                    );

                    participant.setAbsenceReason(

                            stringValue(
                                    p.get("motif")
                            )
                    );

                    participant.setMontant(

                            decimalValue(
                                    p.get(
                                            "montant"
                                    )
                            )
                    );


                    newParticipants.add(
                            participant
                    );
                }


                // ================================================
                // ENFANTS
                // ================================================

                List<Map<String, Object>> enfants =
                        mapList(
                                props.get(
                                        "enfantsParticipants"
                                )
                        );


                for (
                        Map<String, Object> p :
                        enfants
                ) {

                    if (
                            p.get("id")
                                    == null
                    ) {

                        continue;
                    }


                    EventParticipant participant =
                            new EventParticipant();


                    participant.setEvent(
                            event
                    );

                    participant.setParticipantType(
                            ParticipantType.ENFANT
                    );

                    participant.setEnfant(

                            eventService.getEnfantById(

                                    Long.valueOf(
                                            p.get("id")
                                                    .toString()
                                    )
                            )
                    );

                    participant.setPresent(

                            booleanValue(
                                    p.get("present"),
                                    true
                            )
                    );

                    participant.setAbsenceReason(

                            stringValue(
                                    p.get("motif")
                            )
                    );

                    participant.setMontant(

                            decimalValue(
                                    p.get(
                                            "montant"
                                    )
                            )
                    );


                    newParticipants.add(
                            participant
                    );
                }


                // ================================================
                // FAMILLES
                // ================================================

                List<Map<String, Object>> familles =
                        mapList(
                                props.get(
                                        "famillesParticipants"
                                )
                        );


                for (
                        Map<String, Object> p :
                        familles
                ) {

                    if (
                            p.get("id")
                                    == null
                    ) {

                        continue;
                    }


                    EventParticipant participant =
                            new EventParticipant();


                    participant.setEvent(
                            event
                    );

                    participant.setParticipantType(
                            ParticipantType.FAMILLE
                    );

                    participant.setFamille(

                            eventService.getFamilleById(

                                    Long.valueOf(
                                            p.get("id")
                                                    .toString()
                                    )
                            )
                    );

                    participant.setPresent(

                            booleanValue(
                                    p.get("present"),
                                    true
                            )
                    );

                    participant.setAbsenceReason(

                            stringValue(
                                    p.get("motif")
                            )
                    );

                    participant.setMontant(

                            decimalValue(
                                    p.get(
                                            "montant"
                                    )
                            )
                    );


                    newParticipants.add(
                            participant
                    );
                }


                // ================================================
                // REPLACE PARTICIPANTS
                // ================================================

                event.getParticipants()
                        .clear();


                event.getParticipants()
                        .addAll(
                                newParticipants
                        );
            }


            // ====================================================
            // RECALCUL TOTAL
            // ====================================================

            recalculateMontantTotal(
                    event
            );


            Event saved =
                    eventService.saveEvent(
                            event
                    );


            return ResponseEntity.ok(
                    saved
            );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(500)
                    .body(null);
        }
    }


    // ============================================================
    // GET EVENTS BY TYPE
    // ============================================================

    @GetMapping("/by-type/{typeId}")
    public List<Map<String, Object>> getEventsByType(
            @PathVariable Long typeId,

            @RequestParam(required = false)
            String anneeScolaire,

            @RequestParam(required = false)
            Integer year
    ) {

        return eventService
                .getEventsByType(
                        typeId
                )
                .stream()
                .filter(
                        event ->
                                matchesAnneeScolaire(
                                        event,
                                        anneeScolaire,
                                        year
                                )
                )
                .map(
                        event -> {

                            Map<String, Object> map =
                                    new HashMap<>();

                            map.put(
                                    "id",
                                    event.getId()
                            );

                            map.put(
                                    "title",
                                    event.getTitle()
                            );

                            map.put(
                                    "startDate",
                                    event.getStartDate()
                            );

                            map.put(
                                    "endDate",
                                    event.getEndDate()
                            );

                            map.put(
                                    "place",
                                    event.getPlace()
                            );

                            map.put(
                                    "anneeScolaire",
                                    event.getAnneeScolaire()
                            );

                            map.put(
                                    "sawaedAlKhayr",
                                    Boolean.TRUE.equals(event.getSawaedAlKhayr())
                            );

                            map.put(
                                    "degresFamille",

                                    event.getDegresFamille()
                                            != null

                                            ? event.getDegresFamille()

                                            : new ArrayList<>()
                            );

                            map.put(
                                    "cibles",

                                    event.getCibles()
                                            != null

                                            ? event
                                            .getCibles()
                                            .stream()
                                            .map(
                                                    Enum::name
                                            )
                                            .toList()

                                            : new ArrayList<>()
                            );

                            MontantsCategories categories =
                                    calculerMontantsCategories(event);

                            map.put("montantDegresDefinis", categories.degresDefinis());
                            map.put("montantMouawiz", categories.mouawiz());
                            map.put("montantSawaedAlKhayr", categories.sawaedAlKhayr());
                            map.put("montantNonVentile", categories.nonVentile());

                            return map;
                        }
                )
                .toList();
    }


    // ============================================================
    // STATS PAR FAMILLE
    // ============================================================

    @GetMapping("/stats/familles")
    public ResponseEntity<List<Map<String, Object>>> getFamillesStats(
            @RequestParam(required = false)
            String anneeScolaire,

            @RequestParam(required = false)
            Integer year
    ) {

        Map<Long, Long> mereToFamille =
                new HashMap<>();

        Map<Long, Long> enfantToFamille =
                new HashMap<>();


        for (
                Famille famille :
                eventService.getAllFamilles()
        ) {

            if (
                    famille.getMere()
                            != null
            ) {

                mereToFamille.put(

                        famille
                                .getMere()
                                .getId(),

                        famille.getId()
                );
            }


            if (
                    famille.getEnfants()
                            != null
            ) {

                for (
                        Enfant enfant :
                        famille.getEnfants()
                ) {

                    enfantToFamille.put(
                            enfant.getId(),
                            famille.getId()
                    );
                }
            }
        }


        Map<Long, List<Map<String, Object>>> byFamille =
                new HashMap<>();


        for (
                Event event :
                eventService.getAllEvents()
        ) {

            if (
                    !matchesAnneeScolaire(
                            event,
                            anneeScolaire,
                            year
                    )
            ) {

                continue;
            }


            for (
                    EventParticipant participant :
                    safeParticipants(
                            event
                    )
            ) {

                Long familleId =
                        null;

                String who =
                        "";


                if (
                        participant.getParticipantType()
                                == ParticipantType.FAMILLE

                                && participant.getFamille()
                                != null
                ) {

                    familleId =
                            participant
                                    .getFamille()
                                    .getId();

                    who =
                            "العائلة";
                }


                else if (
                        participant.getParticipantType()
                                == ParticipantType.MERE

                                && participant.getMere()
                                != null
                ) {

                    familleId =
                            mereToFamille.get(

                                    participant
                                            .getMere()
                                            .getId()
                            );

                    who =
                            "الأم: "
                                    + safeString(
                                    participant
                                            .getMere()
                                            .getNom()
                            )
                                    + " "
                                    + safeString(
                                    participant
                                            .getMere()
                                            .getPrenom()
                            );
                }


                else if (
                        participant.getParticipantType()
                                == ParticipantType.ENFANT

                                && participant.getEnfant()
                                != null
                ) {

                    familleId =
                            enfantToFamille.get(

                                    participant
                                            .getEnfant()
                                            .getId()
                            );

                    who =
                            "الطفل: "
                                    + safeString(
                                    participant
                                            .getEnfant()
                                            .getNom()
                            )
                                    + " "
                                    + safeString(
                                    participant
                                            .getEnfant()
                                            .getPrenom()
                            );
                }


                if (
                        familleId == null
                ) {

                    continue;
                }


                Map<String, Object> row =
                        new HashMap<>();


                row.put(
                        "eventId",
                        event.getId()
                );

                row.put(
                        "title",
                        event.getTitle()
                );

                row.put(
                        "startDate",
                        event.getStartDate()
                );

                row.put(
                        "anneeScolaire",
                        event.getAnneeScolaire()
                );

                row.put(
                        "type",

                        event.getEventType()
                                != null

                                ? event
                                .getEventType()
                                .getName()

                                : ""
                );

                row.put(
                        "participant",
                        who
                );

                row.put(
                        "present",

                        participant.getPresent()
                                == null
                                || participant.getPresent()
                );

                row.put(
                        "motif",
                        participant.getAbsenceReason()
                );

                row.put(
                        "montant",

                        safeBigDecimal(
                                participant.getMontant()
                        )
                );


                byFamille
                        .computeIfAbsent(
                                familleId,
                                key ->
                                        new ArrayList<>()
                        )
                        .add(
                                row
                        );
            }
        }


        List<Map<String, Object>> result =
                new ArrayList<>();


        for (
                Map.Entry<
                        Long,
                        List<Map<String, Object>>
                        > entry :
                byFamille.entrySet()
        ) {

            BigDecimal total =
                    BigDecimal.ZERO;

            int present =
                    0;

            int absent =
                    0;


            for (
                    Map<String, Object> row :
                    entry.getValue()
            ) {

                total =
                        total.add(

                                (
                                        BigDecimal
                                        ) row.get(
                                        "montant"
                                )
                        );


                if (
                        Boolean.TRUE.equals(
                                row.get(
                                        "present"
                                )
                        )
                ) {

                    present++;

                } else {

                    absent++;
                }
            }


            Map<String, Object> map =
                    new HashMap<>();

            map.put(
                    "familleId",
                    entry.getKey()
            );

            map.put(
                    "total",
                    total
            );

            map.put(
                    "presentCount",
                    present
            );

            map.put(
                    "absentCount",
                    absent
            );

            map.put(
                    "events",
                    entry.getValue()
            );


            result.add(
                    map
            );
        }


        return ResponseEntity.ok(
                result
        );
    }


    // ============================================================
    // CATEGORIES FINANCIERES
    //
    // Priorité absolue :
    // 1) Si sawaedAlKhayr = true -> TOUT le montant de l'événement
    //    va dans سواعد الخير uniquement.
    // 2) Sinon :
    //    - famille avec degré -> درجات محددة
    //    - famille sans degré -> معوز
    // 3) Si un montant ne peut pas être ventilé honnêtement,
    //    il va dans nonVentile au lieu d'être mélangé.
    // ============================================================

    private record MontantsCategories(
            BigDecimal degresDefinis,
            BigDecimal mouawiz,
            BigDecimal sawaedAlKhayr,
            BigDecimal nonVentile
    ) {
    }


    private MontantsCategories calculerMontantsCategories(
            Event event
    ) {

        BigDecimal zero =
                BigDecimal.ZERO;


        // --------------------------------------------------------
        // سواعد الخير : priorité absolue
        // --------------------------------------------------------

        if (
                Boolean.TRUE.equals(
                        event.getSawaedAlKhayr()
                )
        ) {

            return new MontantsCategories(
                    zero,
                    zero,
                    safeBigDecimal(
                            event.getMontantTotal()
                    ),
                    zero
            );
        }


        List<Famille> familles =
                eventService.getAllFamilles();


        Map<Long, Famille> familleParMere =
                new HashMap<>();

        Map<Long, Famille> familleParEnfant =
                new HashMap<>();


        for (Famille famille : familles) {

            if (
                    famille.getMere() != null
                            && famille.getMere().getId() != null
            ) {

                familleParMere.put(
                        famille.getMere().getId(),
                        famille
                );
            }


            if (famille.getEnfants() != null) {

                for (Enfant enfant : famille.getEnfants()) {

                    if (
                            enfant != null
                                    && enfant.getId() != null
                    ) {

                        familleParEnfant.put(
                                enfant.getId(),
                                famille
                        );
                    }
                }
            }
        }


        // --------------------------------------------------------
        // Montant GLOBAL : pas de montant individuel fiable.
        // On classe seulement si tous les bénéficiaires appartiennent
        // clairement à une seule catégorie.
        // --------------------------------------------------------

        if (
                "GLOBAL".equals(
                        event.getTypeMontant()
                )
        ) {

            boolean hasDefined =
                    false;

            boolean hasMouawiz =
                    false;


            for (
                    EventParticipant participant :
                    safeParticipants(event)
            ) {

                Famille famille =
                        resolveFamilleParticipant(
                                participant,
                                familleParMere,
                                familleParEnfant
                        );


                if (
                        famille != null
                                && famille.getDegreFamille() != null
                ) {

                    hasDefined =
                            true;

                } else {

                    hasMouawiz =
                            true;
                }
            }


            BigDecimal total =
                    safeBigDecimal(
                            event.getMontantTotal()
                    );


            if (
                    hasDefined
                            && !hasMouawiz
            ) {

                return new MontantsCategories(
                        total,
                        zero,
                        zero,
                        zero
                );
            }


            if (
                    hasMouawiz
                            && !hasDefined
            ) {

                return new MontantsCategories(
                        zero,
                        total,
                        zero,
                        zero
                );
            }


            // Si aucun participant n'existe encore, on peut parfois
            // déduire la catégorie à partir des degrés ciblés.
            if (
                    !hasDefined
                            && !hasMouawiz
            ) {

                List<Integer> degres =
                        event.getDegresFamille();


                if (
                        degres != null
                                && !degres.isEmpty()
                ) {

                    boolean hasZero =
                            degres.contains(0);

                    boolean hasRealDegree =
                            degres.stream()
                                    .anyMatch(
                                            d ->
                                                    d != null
                                                            && d > 0
                                    );


                    if (
                            hasRealDegree
                                    && !hasZero
                    ) {

                        return new MontantsCategories(
                                total,
                                zero,
                                zero,
                                zero
                        );
                    }


                    if (
                            hasZero
                                    && !hasRealDegree
                    ) {

                        return new MontantsCategories(
                                zero,
                                total,
                                zero,
                                zero
                        );
                    }
                }
            }


            // Mélange impossible à ventiler sans inventer.
            return new MontantsCategories(
                    zero,
                    zero,
                    zero,
                    total
            );
        }


        // --------------------------------------------------------
        // Montant DISTRIBUE : on peut classer participant par participant.
        // --------------------------------------------------------

        BigDecimal definis =
                BigDecimal.ZERO;

        BigDecimal mouawiz =
                BigDecimal.ZERO;


        for (
                EventParticipant participant :
                safeParticipants(event)
        ) {

            Famille famille =
                    resolveFamilleParticipant(
                            participant,
                            familleParMere,
                            familleParEnfant
                    );


            BigDecimal montant =
                    safeBigDecimal(
                            participant.getMontant()
                    );


            if (
                    famille != null
                            && famille.getDegreFamille() != null
            ) {

                definis =
                        definis.add(
                                montant
                        );

            } else {

                mouawiz =
                        mouawiz.add(
                                montant
                        );
            }
        }


        // La charge supplémentaire d'un événement normal n'est pas
        // attribuée arbitrairement à معوز ou aux degrés définis.
        BigDecimal nonVentile =
                safeBigDecimal(
                        event.getChargeSupplementaire()
                );


        return new MontantsCategories(
                definis,
                mouawiz,
                zero,
                nonVentile
        );
    }


    private Famille resolveFamilleParticipant(
            EventParticipant participant,
            Map<Long, Famille> familleParMere,
            Map<Long, Famille> familleParEnfant
    ) {

        if (
                participant == null
        ) {

            return null;
        }


        if (
                participant.getParticipantType()
                        == ParticipantType.FAMILLE
        ) {

            return participant.getFamille();
        }


        if (
                participant.getParticipantType()
                        == ParticipantType.MERE
                        && participant.getMere() != null
        ) {

            return familleParMere.get(
                    participant.getMere().getId()
            );
        }


        if (
                participant.getParticipantType()
                        == ParticipantType.ENFANT
                        && participant.getEnfant() != null
        ) {

            return familleParEnfant.get(
                    participant.getEnfant().getId()
            );
        }


        return null;
    }


    // ============================================================
    // BUILD ELIGIBLE PARTICIPANTS
    //
    // IMPORTANT :
    // Le filtre des degrés fonctionne maintenant aussi
    // pour mère/enfant en retrouvant leur famille.
    //
    // 0 = degré non défini.
    // ============================================================

    private List<EventParticipant> buildEligibleParticipants(
            Event event,
            List<EventParticipant> previousParticipants
    ) {

        List<EventParticipant> result =
                new ArrayList<>();


        List<Famille> familles =
                eventService.getAllFamilles();


        List<Integer> selectedDegrees =
                event.getDegresFamille()
                        != null

                        ? event.getDegresFamille()

                        : new ArrayList<>();


        List<Cible> cibles =
                event.getCibles()
                        != null

                        ? event.getCibles()

                        : new ArrayList<>();


        // ========================================================
        // MÈRES
        // ========================================================

        if (
                cibles.contains(
                        Cible.MERE
                )
        ) {

            for (
                    Mere mere :
                    eventService.getAllMeres()
            ) {

                Famille famille =
                        findFamilleByMere(
                                familles,
                                mere.getId()
                        );


                if (
                        !matchesDegre(
                                famille,
                                selectedDegrees
                        )
                ) {

                    continue;
                }


                EventParticipant old =
                        findOldParticipant(
                                previousParticipants,
                                ParticipantType.MERE,
                                mere.getId()
                        );


                EventParticipant participant =
                        new EventParticipant();


                participant.setEvent(
                        event
                );

                participant.setParticipantType(
                        ParticipantType.MERE
                );

                participant.setMere(
                        mere
                );


                copyPresence(
                        old,
                        participant
                );


                participant.setMontant(

                        calculateAutomaticParticipantAmount(
                                event,
                                famille
                        )
                );


                result.add(
                        participant
                );
            }
        }


        // ========================================================
        // ENFANTS
        // ========================================================

        if (
                cibles.contains(
                        Cible.ENFANT
                )
        ) {

            for (
                    Enfant enfant :
                    eventService.getAllEnfants()
            ) {

                Integer age =
                        enfant.getAge();


                if (
                        age != null
                ) {

                    if (
                            event.getAgeMin()
                                    != null
                                    && age <
                                    event.getAgeMin()
                    ) {

                        continue;
                    }


                    if (
                            event.getAgeMax()
                                    != null
                                    && age >
                                    event.getAgeMax()
                    ) {

                        continue;
                    }
                }


                Famille famille =
                        findFamilleByEnfant(
                                familles,
                                enfant.getId()
                        );


                if (
                        !matchesDegre(
                                famille,
                                selectedDegrees
                        )
                ) {

                    continue;
                }


                EventParticipant old =
                        findOldParticipant(
                                previousParticipants,
                                ParticipantType.ENFANT,
                                enfant.getId()
                        );


                EventParticipant participant =
                        new EventParticipant();


                participant.setEvent(
                        event
                );

                participant.setParticipantType(
                        ParticipantType.ENFANT
                );

                participant.setEnfant(
                        enfant
                );


                copyPresence(
                        old,
                        participant
                );


                participant.setMontant(

                        calculateAutomaticParticipantAmount(
                                event,
                                famille
                        )
                );


                result.add(
                        participant
                );
            }
        }


        // ========================================================
        // FAMILLES
        // ========================================================

        if (
                cibles.contains(
                        Cible.FAMILLE
                )
        ) {

            for (
                    Famille famille :
                    familles
            ) {

                if (
                        !matchesDegre(
                                famille,
                                selectedDegrees
                        )
                ) {

                    continue;
                }


                EventParticipant old =
                        findOldParticipant(
                                previousParticipants,
                                ParticipantType.FAMILLE,
                                famille.getId()
                        );


                EventParticipant participant =
                        new EventParticipant();


                participant.setEvent(
                        event
                );

                participant.setParticipantType(
                        ParticipantType.FAMILLE
                );

                participant.setFamille(
                        famille
                );


                copyPresence(
                        old,
                        participant
                );


                participant.setMontant(

                        calculateAutomaticParticipantAmount(
                                event,
                                famille
                        )
                );


                result.add(
                        participant
                );
            }
        }


        return result;
    }


    // ============================================================
    // DEGREE FILTER
    // ============================================================

    private boolean matchesDegre(
            Famille famille,
            List<Integer> selectedDegrees
    ) {

        /*
         * Aucun degré sélectionné
         * = pas de filtre.
         */
        if (
                selectedDegrees == null
                        || selectedDegrees.isEmpty()
        ) {

            return true;
        }


        /*
         * Famille inexistante
         * = considéré comme degré non défini.
         */
        if (
                famille == null
        ) {

            return selectedDegrees.contains(
                    0
            );
        }


        Integer degree =
                famille.getDegreFamille();


        /*
         * null = غير محدد
         */
        int key =
                degree == null
                        ? 0
                        : degree;


        return selectedDegrees.contains(
                key
        );
    }


    // ============================================================
    // FIND FAMILY FOR MERE
    // ============================================================

    private Famille findFamilleByMere(
            List<Famille> familles,
            Long mereId
    ) {

        if (
                mereId == null
        ) {

            return null;
        }


        return familles.stream()
                .filter(
                        famille ->
                                famille.getMere()
                                        != null

                                        && mereId.equals(
                                        famille
                                                .getMere()
                                                .getId()
                                )
                )
                .findFirst()
                .orElse(null);
    }


    // ============================================================
    // FIND FAMILY FOR CHILD
    // ============================================================

    private Famille findFamilleByEnfant(
            List<Famille> familles,
            Long enfantId
    ) {

        if (
                enfantId == null
        ) {

            return null;
        }


        for (
                Famille famille :
                familles
        ) {

            if (
                    famille.getEnfants()
                            == null
            ) {

                continue;
            }


            boolean found =
                    famille.getEnfants()
                            .stream()
                            .anyMatch(
                                    enfant ->
                                            enfantId.equals(
                                                    enfant.getId()
                                            )
                            );


            if (found) {

                return famille;
            }
        }


        return null;
    }


    // ============================================================
    // FIND PREVIOUS PARTICIPANT
    // ============================================================

    private EventParticipant findOldParticipant(
            List<EventParticipant> participants,
            ParticipantType type,
            Long entityId
    ) {

        if (
                participants == null
                        || entityId == null
        ) {

            return null;
        }


        for (
                EventParticipant participant :
                participants
        ) {

            if (
                    participant.getParticipantType()
                            != type
            ) {

                continue;
            }


            if (
                    type == ParticipantType.MERE
                            && participant.getMere()
                            != null
                            && entityId.equals(
                            participant
                                    .getMere()
                                    .getId()
                    )
            ) {

                return participant;
            }


            if (
                    type == ParticipantType.ENFANT
                            && participant.getEnfant()
                            != null
                            && entityId.equals(
                            participant
                                    .getEnfant()
                                    .getId()
                    )
            ) {

                return participant;
            }


            if (
                    type == ParticipantType.FAMILLE
                            && participant.getFamille()
                            != null
                            && entityId.equals(
                            participant
                                    .getFamille()
                                    .getId()
                    )
            ) {

                return participant;
            }
        }


        return null;
    }


    // ============================================================
    // COPY PRESENCE / MOTIF
    // ============================================================

    private void copyPresence(
            EventParticipant oldParticipant,
            EventParticipant newParticipant
    ) {

        if (
                oldParticipant != null
        ) {

            newParticipant.setPresent(

                    oldParticipant.getPresent()
                            != null

                            ? oldParticipant.getPresent()

                            : true
            );


            newParticipant.setAbsenceReason(

                    oldParticipant
                            .getAbsenceReason()
            );

        } else {

            newParticipant.setPresent(
                    true
            );

            newParticipant.setAbsenceReason(
                    null
            );
        }
    }


    // ============================================================
    // AUTOMATIC PARTICIPANT AMOUNT
    //
    // GLOBAL => 0
    //
    // EGAL => montantEgal
    //
    // DEGRE =>
    //   1 => montantsParDegre[1]
    //   2 => montantsParDegre[2]
    //   3 => montantsParDegre[3]
    // null => montantsParDegre[0]
    // ============================================================

    private BigDecimal calculateAutomaticParticipantAmount(
            Event event,
            Famille famille
    ) {

        if (
                !"DISTRIBUE".equals(
                        event.getTypeMontant()
                )
        ) {

            return BigDecimal.ZERO;
        }


        if (
                "EGAL".equals(
                        event.getModeRepartition()
                )
        ) {

            return safeBigDecimal(
                    event.getMontantEgal()
            );
        }


        if (
                !"DEGRE".equals(
                        event.getModeRepartition()
                )
        ) {

            return BigDecimal.ZERO;
        }


        Integer degree =
                famille != null
                        ? famille.getDegreFamille()
                        : null;


        int key =
                degree == null
                        ? 0
                        : degree;


        Map<Integer, BigDecimal> map =
                event.getMontantsParDegre();


        if (
                map == null
        ) {

            return BigDecimal.ZERO;
        }


        return safeBigDecimal(
                map.get(key)
        );
    }


    // ============================================================
    // RECALCULATE TOTAL
    // ============================================================

    private void recalculateMontantTotal(
            Event event
    ) {

        BigDecimal charge =
                safeBigDecimal(
                        event.getChargeSupplementaire()
                );


        // --------------------------------------------------------
        // GLOBAL
        // --------------------------------------------------------

        if (
                "GLOBAL".equals(
                        event.getTypeMontant()
                )
        ) {

            event.setMontantTotal(

                    safeBigDecimal(
                            event.getMontantGlobal()
                    ).add(
                            charge
                    )
            );

            return;
        }


        // --------------------------------------------------------
        // DISTRIBUE
        // --------------------------------------------------------

        BigDecimal participantsTotal =
                safeParticipants(event)
                        .stream()
                        .map(
                                participant ->
                                        safeBigDecimal(
                                                participant.getMontant()
                                        )
                        )
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        );


        event.setMontantTotal(

                participantsTotal.add(
                        charge
                )
        );
    }


    // ============================================================
    // BASIC EVENT SERIALIZER
    // ============================================================

    private Map<String, Object> serializeBasicEvent(
            Event event
    ) {

        Map<String, Object> map =
                new HashMap<>();


        map.put(
                "id",
                event.getId()
        );

        map.put(
                "title",
                event.getTitle()
        );

        map.put(
                "startDate",
                event.getStartDate()
        );

        map.put(
                "endDate",
                event.getEndDate()
        );

        map.put(
                "calendar",
                event.getCalendarLevel()
        );

        map.put(
                "place",
                event.getPlace()
        );

        map.put(
                "ageMin",
                event.getAgeMin()
        );

        map.put(
                "ageMax",
                event.getAgeMax()
        );

        map.put(
                "anneeScolaire",
                event.getAnneeScolaire()
        );

        map.put(
                "sawaedAlKhayr",
                Boolean.TRUE.equals(event.getSawaedAlKhayr())
        );

        MontantsCategories categories =
                calculerMontantsCategories(event);

        map.put("montantDegresDefinis", categories.degresDefinis());
        map.put("montantMouawiz", categories.mouawiz());
        map.put("montantSawaedAlKhayr", categories.sawaedAlKhayr());
        map.put("montantNonVentile", categories.nonVentile());

        // Conservé uniquement pour compatibilité interne.
        // L'interface ne doit pas l'utiliser pour mélanger les trois caisses.
        map.put(
                "montantTotal",
                safeBigDecimal(
                        event.getMontantTotal()
                )
        );

        map.put(
                "degresFamille",

                event.getDegresFamille()
                        != null

                        ? event.getDegresFamille()

                        : new ArrayList<>()
        );


        map.put(
                "cibles",

                event.getCibles()
                        != null

                        ? event
                        .getCibles()
                        .stream()
                        .map(
                                Enum::name
                        )
                        .toList()

                        : new ArrayList<>()
        );


        if (
                event.getEventType()
                        != null
        ) {

            Map<String, Object> typeMap =
                    new HashMap<>();

            typeMap.put(
                    "id",
                    event
                            .getEventType()
                            .getId()
            );

            typeMap.put(
                    "name",
                    event
                            .getEventType()
                            .getName()
            );

            map.put(
                    "eventType",
                    typeMap
            );

        } else {

            map.put(
                    "eventType",
                    null
            );
        }


        return map;
    }


    // ============================================================
    // FILE BUILDER
    // ============================================================

    private List<EventFile> buildFiles(
            Object raw,
            Event event
    ) {

        List<EventFile> result =
                new ArrayList<>();


        if (
                !(raw instanceof List<?> list)
        ) {

            return result;
        }


        for (
                Object item :
                list
        ) {

            if (
                    !(item instanceof Map<?, ?> map)
            ) {

                continue;
            }


            EventFile file =
                    new EventFile();


            file.setBase64(
                    stringValue(
                            map.get(
                                    "base64"
                            )
                    )
            );


            file.setType(
                    stringValue(
                            map.get(
                                    "type"
                            )
                    )
            );


            file.setName(
                    stringValue(
                            map.get(
                                    "name"
                            )
                    )
            );


            file.setEvent(
                    event
            );


            result.add(
                    file
            );
        }


        return result;
    }


    // ============================================================
    // PARSE MONTANTS PAR DEGRE
    //
    // IMPORTANT :
    // JSON convertit les clés en String.
    //
    // "0" devient Integer 0.
    // ============================================================

    private Map<Integer, BigDecimal> parseMontantsParDegre(
            Object raw
    ) {

        Map<Integer, BigDecimal> result =
                new HashMap<>();


        if (
                !(raw instanceof Map<?, ?> map)
        ) {

            return result;
        }


        for (
                Map.Entry<?, ?> entry :
                map.entrySet()
        ) {

            if (
                    entry.getKey()
                            == null
            ) {

                continue;
            }


            Integer degree =
                    Integer.valueOf(
                            entry.getKey()
                                    .toString()
                    );


            BigDecimal amount =
                    decimalValue(
                            entry.getValue()
                    );


            /*
             * degree = 0
             * est parfaitement valide.
             */
            result.put(
                    degree,
                    amount
            );
        }


        return result;
    }


    // ============================================================
    // PARSE CIBLES
    // ============================================================

    private List<Cible> parseCibles(
            Object raw
    ) {

        List<Cible> result =
                new ArrayList<>();


        if (
                !(raw instanceof List<?> list)
        ) {

            return result;
        }


        for (
                Object item :
                list
        ) {

            if (
                    item == null
            ) {

                continue;
            }


            result.add(

                    Cible.valueOf(

                            item
                                    .toString()
                                    .trim()
                                    .toUpperCase()
                    )
            );
        }


        return result;
    }


    // ============================================================
    // PARSE INTEGER LIST
    // ============================================================

    private List<Integer> parseIntegerList(
            Object raw
    ) {

        List<Integer> result =
                new ArrayList<>();


        if (
                !(raw instanceof List<?> list)
        ) {

            return result;
        }


        for (
                Object item :
                list
        ) {

            if (
                    item == null
            ) {

                continue;
            }


            int value =
                    Integer.parseInt(
                            item.toString()
                    );


            /*
             * Seulement :
             * 0, 1, 2, 3
             */
            if (
                    value >= 0
                            && value <= 3
                            && !result.contains(
                            value
                    )
            ) {

                result.add(
                        value
                );
            }
        }


        return result;
    }


    // ============================================================
    // MAP LIST
    // ============================================================

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> mapList(
            Object raw
    ) {

        if (
                raw instanceof List<?>
        ) {

            return (List<Map<String, Object>>)
                    raw;
        }


        return new ArrayList<>();
    }


    // ============================================================
    // GET MAP
    // ============================================================

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(
            Object raw
    ) {

        if (
                raw instanceof Map<?, ?>
        ) {

            return (Map<String, Object>)
                    raw;
        }


        return null;
    }


    // ============================================================
    // DECIMAL
    // ============================================================

    private BigDecimal decimalValue(
            Object value
    ) {

        if (
                value == null
        ) {

            return BigDecimal.ZERO;
        }


        try {

            return new BigDecimal(
                    value.toString()
            );

        } catch (Exception e) {

            return BigDecimal.ZERO;
        }
    }


    // ============================================================
    // INTEGER
    // ============================================================

    private Integer integerValue(
            Object value
    ) {

        if (
                value == null
        ) {

            return null;
        }


        try {

            return Integer.valueOf(
                    value.toString()
            );

        } catch (Exception e) {

            return null;
        }
    }


    // ============================================================
    // BOOLEAN
    // ============================================================

    private boolean booleanValue(
            Object value,
            boolean defaultValue
    ) {

        if (
                value == null
        ) {

            return defaultValue;
        }


        if (
                value instanceof Boolean b
        ) {

            return b;
        }


        return Boolean.parseBoolean(
                value.toString()
        );
    }


    // ============================================================
    // STRING
    // ============================================================

    private String stringValue(
            Object value
    ) {

        return value != null
                ? value.toString()
                : null;
    }


    private String safeString(
            String value
    ) {

        return value != null
                ? value
                : "";
    }


    // ============================================================
    // SAFE BIG DECIMAL
    // ============================================================

    private BigDecimal safeBigDecimal(
            BigDecimal value
    ) {

        return value != null
                ? value
                : BigDecimal.ZERO;
    }


    // ============================================================
    // SAFE PARTICIPANTS
    // ============================================================

    private List<EventParticipant> safeParticipants(
            Event event
    ) {

        return event.getParticipants()
                != null

                ? event.getParticipants()

                : new ArrayList<>();
    }


    // ============================================================
    // SCHOOL YEAR VALIDATION
    // ============================================================

    private String validateAnneeScolaire(
            String value
    ) {

        String normalized =
                value == null
                        ? ""
                        : value.trim();


        if (
                !normalized.matches(
                        "\\d{4}/\\d{4}"
                )
        ) {

            throw new RuntimeException(

                    "Invalid school year format. Expected: 2026/2027"
            );
        }


        String[] parts =
                normalized.split(
                        "/"
                );


        int start =
                Integer.parseInt(
                        parts[0]
                );


        int end =
                Integer.parseInt(
                        parts[1]
                );


        if (
                end !=
                        start + 1
        ) {

            throw new RuntimeException(

                    "Invalid school year. End year must equal start year + 1"
            );
        }


        return normalized;
    }


    // ============================================================
    // SCHOOL YEAR FILTER
    // ============================================================

    private boolean matchesAnneeScolaire(
            Event event,
            String anneeScolaire,
            Integer year
    ) {

        if (
                anneeScolaire != null
                        && !anneeScolaire
                        .trim()
                        .isEmpty()
        ) {

            return anneeScolaire
                    .trim()
                    .equals(
                            event.getAnneeScolaire()
                    );
        }


        /*
         * Compatibilité ancien frontend.
         */
        if (
                year != null
        ) {

            return event.getStartDate()
                    != null

                    && event
                    .getStartDate()
                    .getYear()
                    == year;
        }


        return true;
    }
}
