package com.example.backend.Controller;

import com.example.backend.Repository.EventTypeRepository;
import com.example.backend.model.*;
import com.example.backend.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
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

    // --------------------- CREATE EVENT ---------------------
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
                    ef.setEvent(event);
                    eventFiles.add(ef);
                }
                event.setFiles(eventFiles);
            }

            // Participants
            List<Map<String, Object>> participantsData = (List<Map<String, Object>>) props.get("participants");
            if (participantsData != null) {
                List<EventParticipant> participants = new ArrayList<>();
                for (Map<String, Object> p : participantsData) {
                    EventParticipant ep = new EventParticipant();
                    ep.setEvent(event);
                    ep.setParticipantType(ParticipantType.valueOf((String) p.get("type")));
                    ep.setPresent((Boolean) p.getOrDefault("present", true));
                    ep.setAbsenceReason((String) p.getOrDefault("absenceReason", null));

                    switch (ep.getParticipantType()) {
                        case MERE -> ep.setMere(eventService.getMereById(Long.valueOf(p.get("mereId").toString())));
                        case ENFANT -> ep.setEnfant(eventService.getEnfantById(Long.valueOf(p.get("enfantId").toString())));
                        case FAMILLE -> ep.setFamille(eventService.getFamilleById(Long.valueOf(p.get("familleId").toString())));
                    }
                    participants.add(ep);
                }
                event.setParticipants(participants);
            }

            Event saved = eventService.saveEvent(event);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // --------------------- GET BY ID ---------------------
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getEventById(@PathVariable Long id) {
        return eventService.getEventById(id)
                .map(ev -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", ev.getId());
                    map.put("title", ev.getTitle());
                    map.put("startDate", ev.getStartDate());
                    map.put("endDate", ev.getEndDate());
                    map.put("calendar", ev.getCalendarLevel());
                    map.put("place", ev.getPlace());
                    map.put("ageMin", ev.getAgeMin());
                    map.put("ageMax", ev.getAgeMax());
                    map.put("cibles", ev.getCibles() != null
                            ? ev.getCibles().stream().map(Enum::name).collect(Collectors.toList())
                            : null);

                    // EventType
                    if (ev.getEventType() != null) {
                        Map<String, Object> typeMap = new java.util.HashMap<>();
                        typeMap.put("id", ev.getEventType().getId());
                        typeMap.put("name", ev.getEventType().getName());
                        map.put("eventType", typeMap);
                    } else {
                        map.put("eventType", null);
                    }

                    map.put("description", ev.getDescription());

                    // Photos
                    map.put("photos", ev.getFiles().stream()
                            .map(f -> Map.of("base64", f.getBase64(), "type", f.getType()))
                            .collect(Collectors.toList()));

                    // Participants grouped by type
                    map.put("meresParticipants", ev.getParticipants().stream()
                            .filter(p -> p.getParticipantType() == ParticipantType.MERE && p.getMere() != null)
                            .map(p -> Map.of(
                                    "id", p.getMere().getId(),
                                    "nom", p.getMere().getNom(),
                                    "prenom", p.getMere().getPrenom(),
                                    "present", p.getPresent(),
                                    "motif", p.getAbsenceReason()
                            )).collect(Collectors.toList()));

                    map.put("enfantsParticipants", ev.getParticipants().stream()
                            .filter(p -> p.getParticipantType() == ParticipantType.ENFANT && p.getEnfant() != null)
                            .map(p -> Map.of(
                                    "id", p.getEnfant().getId(),
                                    "nom", p.getEnfant().getNom(),
                                    "prenom", p.getEnfant().getPrenom(),
                                    "age", p.getEnfant().getAge(),
                                    "present", p.getPresent(),
                                    "motif", p.getAbsenceReason()
                            )).collect(Collectors.toList()));

                    map.put("famillesParticipants", ev.getParticipants().stream()
                            .filter(p -> p.getParticipantType() == ParticipantType.FAMILLE && p.getFamille() != null)
                            .map(p -> Map.of(
                                    "id", p.getFamille().getId(),
                                    "present", p.getPresent(),
                                    "motif", p.getAbsenceReason()
                            )).collect(Collectors.toList()));

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
            }

            Event saved = eventService.saveEvent(existingEvent);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

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

                // Files
                List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
                if (files != null) {
                    existingEvent.getFiles().clear();
                    for (Map<String, String> f : files) {
                        EventFile ef = new EventFile();
                        ef.setBase64(f.get("base64"));
                        ef.setType(f.get("type"));
                        ef.setEvent(existingEvent);
                        existingEvent.getFiles().add(ef);
                    }
                }

                // Participants
                List<EventParticipant> updatedParticipants = new ArrayList<>();

                // Mères
                List<Map<String, Object>> meresParticipants = (List<Map<String, Object>>) props.get("meresParticipants");
                if (meresParticipants != null) {
                    for (Map<String, Object> p : meresParticipants) {
                        EventParticipant ep = new EventParticipant();
                        ep.setEvent(existingEvent);
                        ep.setParticipantType(ParticipantType.MERE);
                        ep.setPresent((Boolean) p.getOrDefault("present", true));
                        ep.setAbsenceReason((String) p.getOrDefault("motif", null));
                        Long mereId = Long.valueOf(p.get("id").toString());
                        ep.setMere(eventService.getMereById(mereId));
                        updatedParticipants.add(ep);
                    }
                }

                // Enfants (ajout uniquement si l'événement contient la cible ENFANT)
                List<Map<String, Object>> enfantsParticipants = (List<Map<String, Object>>) props.get("enfantsParticipants");
                if (enfantsParticipants != null && existingEvent.getCibles() != null && existingEvent.getCibles().contains(Cible.ENFANT)) {
                    for (Map<String, Object> p : enfantsParticipants) {
                        EventParticipant ep = new EventParticipant();
                        ep.setEvent(existingEvent);
                        ep.setParticipantType(ParticipantType.ENFANT);
                        ep.setPresent((Boolean) p.getOrDefault("present", true));
                        ep.setAbsenceReason((String) p.getOrDefault("motif", null));
                        Long enfantId = Long.valueOf(p.get("id").toString());
                        ep.setEnfant(eventService.getEnfantById(enfantId));
                        updatedParticipants.add(ep);
                    }
                }

                // Familles
                List<Map<String, Object>> famillesParticipants = (List<Map<String, Object>>) props.get("famillesParticipants");
                if (famillesParticipants != null) {
                    for (Map<String, Object> p : famillesParticipants) {
                        EventParticipant ep = new EventParticipant();
                        ep.setEvent(existingEvent);
                        ep.setParticipantType(ParticipantType.FAMILLE);
                        ep.setPresent((Boolean) p.getOrDefault("present", true));
                        ep.setAbsenceReason((String) p.getOrDefault("motif", null));
                        Long familleId = Long.valueOf(p.get("id").toString());
                        ep.setFamille(eventService.getFamilleById(familleId));
                        updatedParticipants.add(ep);
                    }
                }

                existingEvent.getParticipants().clear();
                existingEvent.getParticipants().addAll(updatedParticipants);
            }

            Event saved = eventService.saveEvent(existingEvent);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // --------------------- GET EVENTS BY TYPE ---------------------
    @GetMapping("/by-type/{typeId}")
    public List<Event> getEventsByType(@PathVariable Long typeId) {
        return eventService.getEventsByType(typeId);
    }
}
