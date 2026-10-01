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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class EventController {

    private final EventService eventService;
    private final EventTypeRepository eventTypeRepository;

    public EventController(EventService eventService, EventTypeRepository eventTypeRepository) {
        this.eventService = eventService;
        this.eventTypeRepository = eventTypeRepository;
    }

    // --------------------- GET ALL EVENTS ---------------------
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllEvents() {
        List<Event> events = eventService.getAllEvents();
        List<Map<String, Object>> serialized = events.stream().map(ev -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", ev.getId());
            map.put("title", ev.getTitle());
            map.put("startDate", ev.getStartDate());
            map.put("endDate", ev.getEndDate());
            map.put("calendar", ev.getCalendarLevel());
            map.put("place", ev.getPlace());
            map.put("ageMin", ev.getAgeMin());
            map.put("ageMax", ev.getAgeMax());
            map.put("degresFamille", ev.getDegresFamille());
            if (ev.getEventType() != null) {
                Map<String, Object> typeMap = new java.util.HashMap<>();
                typeMap.put("id", ev.getEventType().getId());
                typeMap.put("name", ev.getEventType().getName());
                map.put("eventType", typeMap);
            } else {
                map.put("eventType", null);
            }

            map.put("cibles", ev.getCibles() != null ? ev.getCibles().stream().map(Enum::name).toList() : null);

            return map;
        }).toList();

        return ResponseEntity.ok(serialized);
    }
    @GetMapping("/event-types")
    public List<EventType> getEventTypes() {

        String[] types = {"اقتصادي", "ترفيهي", "تربوي", "صحي"};

        for (String name : types) {
            boolean existe = eventTypeRepository.findAll()
                    .stream()
                    .anyMatch(t -> t.getName().equals(name));

            if (!existe) {
                EventType type = new EventType();
                type.setName(name);
                eventTypeRepository.save(type);
            }
        }

        return eventTypeRepository.findAll()
                .stream()
                .filter(t -> t.getName().equals("اقتصادي")
                        || t.getName().equals("ترفيهي")
                        || t.getName().equals("تربوي")
                        || t.getName().equals("صحي"))
                .toList();
    }
    @PostMapping
    public ResponseEntity<Event> createEvent(@RequestBody Map<String, Object> payload) {
        try {
            // Validate basic fields
            String title = (String) payload.get("title");
            if (title == null || title.trim().isEmpty()) {
                throw new RuntimeException("Title is required");
            }

            Event event = new Event();
            event.setTitle(title.trim());

            // Dates
            String startStr = (String) payload.get("start");
            String endStr = (String) payload.get("end");
            if (startStr == null || startStr.trim().isEmpty()) throw new RuntimeException("Start date is required");
            if (endStr == null || endStr.trim().isEmpty()) throw new RuntimeException("End date is required");
            event.setStartDate(LocalDate.parse(startStr.trim()));
            event.setEndDate(LocalDate.parse(endStr.trim()));

            Map<String, Object> props = (Map<String, Object>) payload.get("extendedProps");
            if (props == null) throw new RuntimeException("Extended properties are required");

            // Calendar level
            event.setCalendarLevel((String) props.getOrDefault("calendarLevel", "PRIMARY"));

            // Cibles
            List<String> ciblesStr = (List<String>) props.get("cibles");
            if (ciblesStr == null || ciblesStr.isEmpty()) throw new RuntimeException("Cibles are required");

            List<Cible> cibles = new ArrayList<>();
            for (String c : ciblesStr) cibles.add(Cible.valueOf(c));
            event.setCibles(cibles);
            List<Integer> degresFamille =
                    (List<Integer>) props.get("degresFamille");

            if (degresFamille != null) {
                event.setDegresFamille(degresFamille);
            } else {
                event.setDegresFamille(new ArrayList<>());
            }
            // AgeMin / AgeMax if ENFANT
            if (cibles.contains(Cible.ENFANT)) {
                Object ageMinObj = props.get("ageMin");
                Object ageMaxObj = props.get("ageMax");
                event.setAgeMin(ageMinObj != null ? ((Number) ageMinObj).intValue() : null);
                event.setAgeMax(ageMaxObj != null ? ((Number) ageMaxObj).intValue() : null);
            } else {
                event.setAgeMin(null);
                event.setAgeMax(null);
            }

            // EventType
            Map<String, Object> typeMap = (Map<String, Object>) props.get("eventType");
            if (typeMap == null || typeMap.get("id") == null) throw new RuntimeException("Event type is required");
            Long typeId = Long.valueOf(typeMap.get("id").toString());
            EventType type = eventTypeRepository.findById(typeId)
                    .orElseThrow(() -> new RuntimeException("Event type not found"));
            event.setEventType(type);

            // Description
            String description = (String) props.getOrDefault("description", "");
            event.setDescription(description.trim());

            // Place
            String place = (String) props.get("place");
            if (place == null || place.trim().isEmpty()) throw new RuntimeException("Place is required");
            event.setPlace(place.trim());

            // Files
            List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
            if (files != null) {
                List<EventFile> eventFiles = new ArrayList<>();
                for (Map<String, String> f : files) {
                    EventFile ef = new EventFile();
                    ef.setBase64(f.get("base64"));
                    ef.setType(f.get("type"));
                    ef.setName(f.get("name"));
                    ef.setEvent(event);
                    eventFiles.add(ef);
                }
                event.setFiles(eventFiles);
            }

            // ================= PARTICIPANTS AUTOMATIQUES =================

            List<EventParticipant> participants = new ArrayList<>();


// ================= MÈRES =================
            if (cibles.contains(Cible.MERE)) {

                List<Mere> meres = eventService.getAllMeres();

                for (Mere mere : meres) {

                    EventParticipant ep = new EventParticipant();

                    ep.setEvent(event);
                    ep.setParticipantType(ParticipantType.MERE);
                    ep.setMere(mere);

                    // sélectionnée par défaut
                    ep.setPresent(true);
                    ep.setAbsenceReason(null);

                    // aucun montant au moment de la création
                    ep.setMontant(BigDecimal.ZERO);

                    participants.add(ep);
                }
            }


// ================= ENFANTS =================
            if (cibles.contains(Cible.ENFANT)) {

                List<Enfant> enfants = eventService.getAllEnfants();

                Integer ageMin = event.getAgeMin();
                Integer ageMax = event.getAgeMax();

                for (Enfant enfant : enfants) {

                    Integer age = enfant.getAge();

                    boolean ageValide = true;

                    if (age != null) {

                        if (ageMin != null && age < ageMin) {
                            ageValide = false;
                        }

                        if (ageMax != null && age > ageMax) {
                            ageValide = false;
                        }
                    }

                    if (!ageValide) {
                        continue;
                    }

                    EventParticipant ep = new EventParticipant();

                    ep.setEvent(event);
                    ep.setParticipantType(ParticipantType.ENFANT);
                    ep.setEnfant(enfant);

                    ep.setPresent(true);
                    ep.setAbsenceReason(null);
                    ep.setMontant(BigDecimal.ZERO);

                    participants.add(ep);
                }
            }


// ================= FAMILLES =================
            if (cibles.contains(Cible.FAMILLE)) {

                List<Famille> familles = eventService.getAllFamilles();

                for (Famille famille : familles) {

                    boolean degreValide = true;

                    // Si l'événement précise certains degrés
                    if (
                            degresFamille != null &&
                                    !degresFamille.isEmpty()
                    ) {

                        Integer degreFamille =
                                famille.getDegreFamille();

                        degreValide =
                                degreFamille != null &&
                                        degresFamille.contains(degreFamille);
                    }

                    if (!degreValide) {
                        continue;
                    }

                    EventParticipant ep = new EventParticipant();

                    ep.setEvent(event);
                    ep.setParticipantType(ParticipantType.FAMILLE);
                    ep.setFamille(famille);

                    ep.setPresent(true);
                    ep.setAbsenceReason(null);
                    ep.setMontant(BigDecimal.ZERO);

                    participants.add(ep);
                }
            }


// Affecter tous les participants éligibles
            event.setParticipants(participants);

            Event saved = eventService.saveEvent(event);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }
    // --------------------- STATS ---------------------
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(@RequestParam(required = false) Integer year) {

        List<Event> events = eventService.getAllEvents().stream()
                .filter(ev -> year == null
                        || (ev.getStartDate() != null && ev.getStartDate().getYear() == year))
                .toList();

        Map<Long, Map<String, Object>> byType = new java.util.LinkedHashMap<>();
        BigDecimal grandTotal = BigDecimal.ZERO;

        for (Event ev : events) {
            Long typeId = ev.getEventType() != null ? ev.getEventType().getId() : 0L;
            String typeName = ev.getEventType() != null ? ev.getEventType().getName() : "غير محدد";
            BigDecimal montant = ev.getMontantTotal() != null ? ev.getMontantTotal() : BigDecimal.ZERO;

            Map<String, Object> row = byType.computeIfAbsent(typeId, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("typeId", typeId);
                m.put("typeName", typeName);
                m.put("count", 0);
                m.put("montantTotal", BigDecimal.ZERO);
                return m;
            });

            row.put("count", (Integer) row.get("count") + 1);
            row.put("montantTotal", ((BigDecimal) row.get("montantTotal")).add(montant));
            grandTotal = grandTotal.add(montant);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("year", year);
        result.put("totalEvents", events.size());
        result.put("totalMontant", grandTotal);
        result.put("types", new ArrayList<>(byType.values()));
        return ResponseEntity.ok(result);
    }

    // --------------------- GET BY ID ---------------------
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getEventById(@PathVariable Long id) {
        return eventService.getEventById(id)
                .map(ev -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", ev.getId());
                    map.put("title", ev.getTitle());
                    map.put("startDate", ev.getStartDate());
                    map.put("endDate", ev.getEndDate());
                    map.put("calendar", ev.getCalendarLevel());
                    map.put("place", ev.getPlace());
                    map.put("ageMin", ev.getAgeMin());
                    map.put("ageMax", ev.getAgeMax());
                    map.put("montantTotal", ev.getMontantTotal());
                    map.put("typeMontant", ev.getTypeMontant());
                    map.put("modeRepartition", ev.getModeRepartition());
                    map.put("montantGlobal", ev.getMontantGlobal());
                    map.put("montantsParDegre",
                            ev.getMontantsParDegre() != null ? ev.getMontantsParDegre() : new HashMap<>());
                    map.put("montantEgal", ev.getMontantEgal());
                    map.put("chargeSupplementaire",
                            ev.getChargeSupplementaire() != null ? ev.getChargeSupplementaire() : BigDecimal.ZERO);
                    map.put("chargeSupplementaireLabel", ev.getChargeSupplementaireLabel());
                    map.put("degresFamille",
                            ev.getDegresFamille() != null ? ev.getDegresFamille() : new ArrayList<>());
                    map.put("cibles", ev.getCibles() != null
                            ? ev.getCibles().stream().map(Enum::name).collect(Collectors.toList())
                            : null);

                    // EventType
                    if (ev.getEventType() != null) {
                        Map<String, Object> typeMap = new HashMap<>();
                        typeMap.put("id", ev.getEventType().getId());
                        typeMap.put("name", ev.getEventType().getName());
                        map.put("eventType", typeMap);
                    } else {
                        map.put("eventType", null);
                    }

                    map.put("description", ev.getDescription());

                    // Photos
                    map.put("photos", ev.getFiles().stream()
                            .map(f -> {
                                Map<String, Object> photoMap = new HashMap<>();
                                photoMap.put("base64", f.getBase64());
                                photoMap.put("type", f.getType());
                                photoMap.put("name", f.getName());
                                return photoMap;
                            }).collect(Collectors.toList()));

                    Map<Long, String> nomPereParMere = new HashMap<>();
                    Map<Long, Integer> degreParMere = new HashMap<>();
                    Map<Long, Integer> degreParEnfant = new HashMap<>();

                    for (Famille f : eventService.getAllFamilles()) {
                        if (f.getMere() != null) {
                            if (f.getPere() != null) {
                                nomPereParMere.put(f.getMere().getId(), f.getPere().getNom());
                            }
                            degreParMere.put(f.getMere().getId(), f.getDegreFamille());
                        }
                        // Option A : Famille contient la liste de ses enfants
                        if (f.getEnfants() != null) {
                            for (Enfant e : f.getEnfants()) {
                                degreParEnfant.put(e.getId(), f.getDegreFamille());
                            }
                        }
                    }

                    // Mères
                    map.put("meresParticipants", ev.getMereParticipants().stream()
                            .map(p -> {
                                Map<String, Object> participantMap = new HashMap<>();
                                participantMap.put("id", p.getMere() != null ? p.getMere().getId() : null);
                                participantMap.put("nom", p.getMere() != null ? p.getMere().getNom() : null);
                                participantMap.put("prenom", p.getMere() != null ? p.getMere().getPrenom() : null);
                                // NOUVEAU
                                participantMap.put("nomFamilleEnfants",
                                        p.getMere() != null ? nomPereParMere.get(p.getMere().getId()) : null);
                                participantMap.put("degreFamille",
                                        p.getMere() != null ? degreParMere.get(p.getMere().getId()) : null);
                                participantMap.put("present", p.getPresent());
                                participantMap.put("motif", p.getAbsenceReason());
                                participantMap.put("montant",
                                        p.getMontant() != null ? p.getMontant() : BigDecimal.ZERO);
                                return participantMap;
                            }).collect(Collectors.toList()));

                    // Enfants
                    map.put("enfantsParticipants", ev.getParticipants().stream()
                            .filter(p -> p.getParticipantType() == ParticipantType.ENFANT && p.getEnfant() != null)
                            .map(p -> {
                                Map<String, Object> participantMap = new HashMap<>();
                                participantMap.put("id", p.getEnfant().getId());
                                participantMap.put("nom", p.getEnfant().getNom());
                                participantMap.put("prenom", p.getEnfant().getPrenom());
                                participantMap.put("age", p.getEnfant().getAge());
                                participantMap.put("present", p.getPresent());
                                participantMap.put("motif", p.getAbsenceReason());
                                participantMap.put("degreFamille", degreParEnfant.get(p.getEnfant().getId()));
                                participantMap.put("montant",
                                        p.getMontant() != null ? p.getMontant() : BigDecimal.ZERO);
                                return participantMap;
                            }).collect(Collectors.toList()));

                    // Familles
                    map.put("famillesParticipants", ev.getParticipants().stream()
                            .filter(p -> p.getParticipantType() == ParticipantType.FAMILLE
                                    && p.getFamille() != null)
                            .map(p -> {
                                Map<String, Object> participantMap = new HashMap<>();
                                participantMap.put("id", p.getFamille().getId());
                                // NOUVEAU
                                participantMap.put("degreFamille", p.getFamille().getDegreFamille());
                                Map<String, Object> pereMap = new HashMap<>();
                                pereMap.put("nom", p.getFamille().getPere() != null
                                        && p.getFamille().getPere().getNom() != null
                                        ? p.getFamille().getPere().getNom() : "");
                                participantMap.put("pere", pereMap);
                                participantMap.put("present", p.getPresent());
                                participantMap.put("motif", p.getAbsenceReason());
                                participantMap.put("montant",
                                        p.getMontant() != null ? p.getMontant() : BigDecimal.ZERO);
                                return participantMap;
                            }).collect(Collectors.toList()));

                    return ResponseEntity.ok(map);
                }).orElse(ResponseEntity.notFound().build());
    }
    // --------------------- DELETE EVENT ---------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    // --------------------- UPDATE EVENT ---------------------
    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Event existingEvent = eventService.getEventById(id)
                    .orElseThrow(() -> new RuntimeException("Event not found"));

            // Title
            String title = (String) payload.get("title");
            if (title != null && !title.trim().isEmpty()) existingEvent.setTitle(title.trim());

            // Dates
            String startStr = (String) payload.get("start");
            String endStr = (String) payload.get("end");
            if (startStr != null && !startStr.trim().isEmpty()) existingEvent.setStartDate(LocalDate.parse(startStr.trim()));
            if (endStr != null && !endStr.trim().isEmpty()) existingEvent.setEndDate(LocalDate.parse(endStr.trim()));

            Map<String, Object> props = (Map<String, Object>) payload.get("extendedProps");
            if (props != null) {

                // Cibles
                List<String> ciblesStr = (List<String>) props.get("cibles");
                if (ciblesStr != null && !ciblesStr.isEmpty()) {
                    List<Cible> cibles = new ArrayList<>();
                    for (String c : ciblesStr) cibles.add(Cible.valueOf(c));
                    existingEvent.setCibles(cibles);

                    if (cibles.contains(Cible.ENFANT)) {
                        Object ageMinObj = props.get("ageMin");
                        Object ageMaxObj = props.get("ageMax");
                        existingEvent.setAgeMin(ageMinObj != null ? ((Number) ageMinObj).intValue() : null);
                        existingEvent.setAgeMax(ageMaxObj != null ? ((Number) ageMaxObj).intValue() : null);
                    } else {
                        existingEvent.setAgeMin(null);
                        existingEvent.setAgeMax(null);
                    }
                }

                // EventType
                Map<String, Object> typeMap = (Map<String, Object>) props.get("eventType");
                if (typeMap != null && typeMap.get("id") != null) {
                    Long typeId = Long.valueOf(typeMap.get("id").toString());
                    EventType type = eventTypeRepository.findById(typeId)
                            .orElseThrow(() -> new RuntimeException("Event type not found"));
                    existingEvent.setEventType(type);
                }

                // Place & Description
                String place = (String) props.get("place");
                if (place != null && !place.trim().isEmpty()) existingEvent.setPlace(place.trim());
                String description = (String) props.get("description");
                if (description != null) existingEvent.setDescription(description.trim());

                // Files
                List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
                if (files != null) {
                    List<EventFile> newEventFiles = files.stream().map(f -> {
                        EventFile ef = new EventFile();
                        ef.setBase64(f.get("base64"));
                        ef.setType(f.get("type"));
                        ef.setEvent(existingEvent);
                        return ef;
                    }).toList();
                    List<EventFile> mergedFiles = new ArrayList<>();
                    if (existingEvent.getFiles() != null) mergedFiles.addAll(existingEvent.getFiles());
                    mergedFiles.addAll(newEventFiles);
                    existingEvent.setFiles(mergedFiles);
                }

                // Participants (update via IDs)
                List<Integer> meresIds = (List<Integer>) props.get("meresParticipants");
                if (meresIds != null) existingEvent.setMereParticipants(eventService.getMeresByIds(meresIds));
                List<Integer> enfantsIds = (List<Integer>) props.get("enfantsParticipants");
                if (enfantsIds != null) existingEvent.setEnfantsParticipants(eventService.getEnfantsByIds(enfantsIds));
                List<Integer> famillesIds = (List<Integer>) props.get("famillesParticipants");
                if (famillesIds != null) existingEvent.setFamilleParticipants(eventService.getFamillesByIds(famillesIds));
                if (props.containsKey("degresFamille")) {
                    List<Integer> degresFamille =
                            (List<Integer>) props.get("degresFamille");

                    existingEvent.setDegresFamille(
                            degresFamille != null
                                    ? degresFamille
                                    : new ArrayList<>()
                    );
                }
            }

            Event saved = eventService.saveEvent(existingEvent);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // --------------------- UPDATE EVENT DETAILS ---------------------
    // --------------------- UPDATE EVENT DETAILS ---------------------
    @PutMapping("/details/{id}")
    public ResponseEntity<Event> updateEvent1(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Event existingEvent = eventService.getEventById(id)
                    .orElseThrow(() -> new RuntimeException("Event not found"));

            Map<String, Object> props = (Map<String, Object>) payload.get("extendedProps");
            if (props != null) {

                // Description
                if (props.get("description") != null)
                    existingEvent.setDescription(((String) props.get("description")).trim());

                // Files : seulement si le frontend envoie "files"
                if (props.containsKey("files")) {
                    List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
                    existingEvent.getFiles().clear();
                    if (files != null) {
                        for (Map<String, String> f : files) {
                            EventFile ef = new EventFile();
                            ef.setBase64(f.get("base64"));
                            ef.setType(f.get("type"));
                            ef.setName(f.get("name"));
                            ef.setEvent(existingEvent);
                            existingEvent.getFiles().add(ef);
                        }
                    }
                }

                // ===== GARDE : participants + montants seulement s'ils sont envoyés =====
                boolean hasParticipantsOrMontant =
                        props.containsKey("typeMontant")
                                || props.containsKey("meresParticipants")
                                || props.containsKey("enfantsParticipants")
                                || props.containsKey("famillesParticipants");

                if (hasParticipantsOrMontant) {

                    List<EventParticipant> updatedParticipants = new ArrayList<>();

                    // Mères
                    List<Map<String, Object>> meresParticipants =
                            (List<Map<String, Object>>) props.get("meresParticipants");
                    if (meresParticipants != null) {
                        for (Map<String, Object> p : meresParticipants) {
                            EventParticipant ep = new EventParticipant();
                            ep.setEvent(existingEvent);
                            ep.setParticipantType(ParticipantType.MERE);
                            ep.setPresent((Boolean) p.getOrDefault("present", true));
                            ep.setAbsenceReason((String) p.getOrDefault("motif", null));
                            ep.setMere(eventService.getMereById(Long.valueOf(p.get("id").toString())));
                            Object m = p.get("montant");
                            ep.setMontant(m != null ? new BigDecimal(m.toString()) : BigDecimal.ZERO);
                            updatedParticipants.add(ep);
                        }
                    }

                    // Enfants
                    List<Map<String, Object>> enfantsParticipants =
                            (List<Map<String, Object>>) props.get("enfantsParticipants");
                    if (enfantsParticipants != null && existingEvent.getCibles() != null
                            && existingEvent.getCibles().contains(Cible.ENFANT)) {
                        for (Map<String, Object> p : enfantsParticipants) {
                            EventParticipant ep = new EventParticipant();
                            ep.setEvent(existingEvent);
                            ep.setParticipantType(ParticipantType.ENFANT);
                            ep.setPresent((Boolean) p.getOrDefault("present", true));
                            ep.setAbsenceReason((String) p.getOrDefault("motif", null));
                            ep.setEnfant(eventService.getEnfantById(Long.valueOf(p.get("id").toString())));
                            Object m = p.get("montant");
                            ep.setMontant(m != null ? new BigDecimal(m.toString()) : BigDecimal.ZERO);
                            updatedParticipants.add(ep);
                        }
                    }

                    // Familles
                    List<Map<String, Object>> famillesParticipants =
                            (List<Map<String, Object>>) props.get("famillesParticipants");
                    if (famillesParticipants != null) {
                        for (Map<String, Object> p : famillesParticipants) {
                            EventParticipant ep = new EventParticipant();
                            ep.setEvent(existingEvent);
                            ep.setParticipantType(ParticipantType.FAMILLE);
                            ep.setPresent((Boolean) p.getOrDefault("present", true));
                            ep.setAbsenceReason((String) p.getOrDefault("motif", null));
                            ep.setFamille(eventService.getFamilleById(Long.valueOf(p.get("id").toString())));
                            Object m = p.get("montant");
                            ep.setMontant(m != null ? new BigDecimal(m.toString()) : BigDecimal.ZERO);
                            updatedParticipants.add(ep);
                        }
                    }

                    // ================= MONTANT EVENT =================
                    String typeMontant = (String) props.getOrDefault("typeMontant", "GLOBAL");
                    existingEvent.setTypeMontant(typeMontant);

                    Object modeObj = props.get("modeRepartition");
                    existingEvent.setModeRepartition(modeObj != null ? modeObj.toString() : null);

                    Object montantEgalObj = props.get("montantEgal");
                    existingEvent.setMontantEgal(
                            montantEgalObj != null ? new BigDecimal(montantEgalObj.toString()) : BigDecimal.ZERO);

                    Map<Integer, BigDecimal> montantsParDegre = new HashMap<>();
                    Object montantsParDegreObj = props.get("montantsParDegre");
                    if (montantsParDegreObj instanceof Map<?, ?> rawMap) {
                        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
                            montantsParDegre.put(
                                    Integer.valueOf(entry.getKey().toString()),
                                    new BigDecimal(entry.getValue().toString()));
                        }
                    }
                    existingEvent.setMontantsParDegre(montantsParDegre);

                    // ===== CHARGE SUPPLEMENTAIRE =====
                    Object chargeObj = props.get("chargeSupplementaire");
                    BigDecimal chargeSupp = chargeObj != null
                            ? new BigDecimal(chargeObj.toString())
                            : BigDecimal.ZERO;
                    existingEvent.setChargeSupplementaire(chargeSupp);

                    Object chargeLabelObj = props.get("chargeSupplementaireLabel");
                    existingEvent.setChargeSupplementaireLabel(
                            chargeLabelObj != null ? chargeLabelObj.toString() : null);

                    // ===== TOTAUX (base + charge) =====
                    if ("GLOBAL".equals(typeMontant)) {
                        Object montantGlobalObj = props.get("montantGlobal");
                        BigDecimal montantGlobal = montantGlobalObj != null
                                ? new BigDecimal(montantGlobalObj.toString())
                                : BigDecimal.ZERO;

                        existingEvent.setMontantGlobal(montantGlobal);
                        existingEvent.setMontantTotal(montantGlobal.add(chargeSupp));
                    } else {
                        BigDecimal montantTotal = updatedParticipants.stream()
                                .map(ep -> ep.getMontant() != null ? ep.getMontant() : BigDecimal.ZERO)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                        existingEvent.setMontantGlobal(BigDecimal.ZERO);
                        existingEvent.setMontantTotal(montantTotal.add(chargeSupp));
                    }

                    existingEvent.getParticipants().clear();
                    existingEvent.getParticipants().addAll(updatedParticipants);
                }
            }

            Event saved = eventService.saveEvent(existingEvent);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }
    // --------------------- GET EVENTS BY TYPE ---------------------
    // --------------------- GET EVENTS BY TYPE ---------------------
    @GetMapping("/by-type/{typeId}")
    public List<Map<String, Object>> getEventsByType(
            @PathVariable Long typeId,
            @RequestParam(required = false) Integer year) {

        return eventService.getEventsByType(typeId).stream()
                .filter(ev -> year == null
                        || (ev.getStartDate() != null && ev.getStartDate().getYear() == year))
                .map(ev -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", ev.getId());
                    m.put("title", ev.getTitle());
                    m.put("startDate", ev.getStartDate());
                    m.put("endDate", ev.getEndDate());
                    m.put("place", ev.getPlace());
                    m.put("cibles", ev.getCibles() != null
                            ? ev.getCibles().stream().map(Enum::name).toList()
                            : new ArrayList<>());
                    m.put("montantTotal",
                            ev.getMontantTotal() != null ? ev.getMontantTotal() : BigDecimal.ZERO);
                    return m;
                })
                .toList();
    }
    // --------------------- STATS PAR FAMILLE ---------------------
    @GetMapping("/stats/familles")
    public ResponseEntity<List<Map<String, Object>>> getFamillesStats(
            @RequestParam(required = false) Integer year) {

        Map<Long, Long> mereToFamille = new HashMap<>();
        Map<Long, Long> enfantToFamille = new HashMap<>();
        for (Famille f : eventService.getAllFamilles()) {
            if (f.getMere() != null) mereToFamille.put(f.getMere().getId(), f.getId());
            if (f.getEnfants() != null) {
                for (Enfant e : f.getEnfants()) enfantToFamille.put(e.getId(), f.getId());
            }
        }

        Map<Long, List<Map<String, Object>>> byFamille = new HashMap<>();

        for (Event ev : eventService.getAllEvents()) {
            if (year != null && (ev.getStartDate() == null || ev.getStartDate().getYear() != year)) continue;
            if (ev.getParticipants() == null) continue;

            for (EventParticipant p : ev.getParticipants()) {
                Long familleId = null;
                String who = "";

                if (p.getParticipantType() == ParticipantType.FAMILLE && p.getFamille() != null) {
                    familleId = p.getFamille().getId();
                    who = "العائلة";
                } else if (p.getParticipantType() == ParticipantType.MERE && p.getMere() != null) {
                    familleId = mereToFamille.get(p.getMere().getId());
                    who = "الأم: " + p.getMere().getNom() + " " + p.getMere().getPrenom();
                } else if (p.getParticipantType() == ParticipantType.ENFANT && p.getEnfant() != null) {
                    familleId = enfantToFamille.get(p.getEnfant().getId());
                    who = "الطفل: " + p.getEnfant().getNom() + " " + p.getEnfant().getPrenom();
                }
                if (familleId == null) continue;

                Map<String, Object> row = new HashMap<>();
                row.put("eventId", ev.getId());
                row.put("title", ev.getTitle());
                row.put("startDate", ev.getStartDate());
                row.put("type", ev.getEventType() != null ? ev.getEventType().getName() : "");
                row.put("participant", who);
                row.put("present", p.getPresent() == null || p.getPresent());
                row.put("motif", p.getAbsenceReason());
                row.put("montant", p.getMontant() != null ? p.getMontant() : BigDecimal.ZERO);
                byFamille.computeIfAbsent(familleId, k -> new ArrayList<>()).add(row);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, List<Map<String, Object>>> en : byFamille.entrySet()) {
            BigDecimal total = BigDecimal.ZERO;
            int present = 0, absent = 0;
            for (Map<String, Object> r : en.getValue()) {
                total = total.add((BigDecimal) r.get("montant"));
                if ((Boolean) r.get("present")) present++; else absent++;
            }
            Map<String, Object> m = new HashMap<>();
            m.put("familleId", en.getKey());
            m.put("total", total);
            m.put("presentCount", present);
            m.put("absentCount", absent);
            m.put("events", en.getValue());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }
}
