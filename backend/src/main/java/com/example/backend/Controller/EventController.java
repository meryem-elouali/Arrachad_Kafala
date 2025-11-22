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

    // --------------------- GET ALL ---------------------
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
            map.put("place", ev.getPlace()); // peut être null
            map.put("ageMin", ev.getAgeMin()); // peut être null
            map.put("ageMax", ev.getAgeMax()); // peut être null

            if (ev.getEventType() != null) {
                Map<String, Object> typeMap = new java.util.HashMap<>();
                typeMap.put("id", ev.getEventType().getId());
                typeMap.put("name", ev.getEventType().getName());
                map.put("eventType", typeMap);
            } else {
                map.put("eventType", null);
            }

            if (ev.getCibles() != null) {
                map.put("cibles", ev.getCibles().stream().map(Enum::name).toList());
            } else {
                map.put("cibles", null);
            }

            return map;
        }).toList();


        return ResponseEntity.ok(serialized);
    }


    // --------------------- CREATE ---------------------
    @PostMapping
    public ResponseEntity<Event> createEvent(@RequestBody Map<String, Object> payload) {
        try {
            Event event = new Event();
            event.setTitle((String) payload.get("title"));
            event.setStartDate(LocalDate.parse((String) payload.get("start")));
            event.setEndDate(LocalDate.parse((String) payload.get("end")));

            Map<String, Object> props = (Map<String, Object>) payload.get("extendedProps");

            // Calendar level
            event.setCalendarLevel((String) props.getOrDefault("calendarLevel", "PRIMARY"));

            // Cible
            List<String> ciblesStr = (List<String>) props.get("cibles");
            if (ciblesStr == null || ciblesStr.isEmpty())
                throw new RuntimeException("Cibles are required");

            List<Cible> cibles = new ArrayList<>();
            for (String c : ciblesStr) {
                cibles.add(Cible.valueOf(c));
            }
            event.setCibles(cibles);

            // --- Gestion ageMin / ageMax si ENFANT ---
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
            if (typeMap == null || typeMap.get("id") == null)
                throw new RuntimeException("Event type is required");
            Long typeId = Long.valueOf(typeMap.get("id").toString());
            EventType type = eventTypeRepository.findById(typeId)
                    .orElseThrow(() -> new RuntimeException("Event type not found"));
            event.setEventType(type);

            // Description
            String description = (String) props.getOrDefault("description", "");
            event.setDescription(description);

            // Lieu de l'événement
            String place = (String) props.get("place");
            if (place == null) throw new RuntimeException("Place is required");
            event.setPlace(place);

            // Fichiers (Base64 + type)
            List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
            if (files != null) {
                List<EventFile> eventFiles = new ArrayList<>();
                for (Map<String, String> f : files) {
                    EventFile ef = new EventFile();
                    ef.setBase64(f.get("base64"));
                    ef.setType(f.get("type"));
                    ef.setEvent(event); // important pour la relation bidirectionnelle
                    eventFiles.add(ef);
                }
                event.setFiles(eventFiles);
            }

            // Participants (Mère, Enfant, Famille)
            List<Map<String, Object>> participantsData = (List<Map<String, Object>>) props.get("participants");
            if (participantsData != null) {
                List<EventParticipant> participants = new ArrayList<>();
                for (Map<String, Object> p : participantsData) {
                    EventParticipant ep = new EventParticipant();
                    ep.setEvent(event);
                    ep.setParticipantType(ParticipantType.valueOf((String) p.get("type")));
                    ep.setPresent((Boolean) p.getOrDefault("present", true));
                    ep.setAbsenceReason((String) p.getOrDefault("absenceReason", null));

                    // Lien vers l'entité correspondante si nécessaire
                    if (ep.getParticipantType() == ParticipantType.MERE) {
                        Long mereId = Long.valueOf(p.get("mereId").toString());
                        ep.setMere(eventService.getMereById(mereId));
                    } else if (ep.getParticipantType() == ParticipantType.ENFANT) {
                        Long enfantId = Long.valueOf(p.get("enfantId").toString());
                        ep.setEnfant(eventService.getEnfantById(enfantId));
                    } else if (ep.getParticipantType() == ParticipantType.FAMILLE) {
                        Long familleId = Long.valueOf(p.get("familleId").toString());
                        ep.setFamille(eventService.getFamilleById(familleId));
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
                    map.put("cibles", ev.getCibles() != null ? ev.getCibles().stream().map(Enum::name).toList() : null);

                    // EventType
                    if (ev.getEventType() != null) {
                        Map<String, Object> typeMap = new java.util.HashMap<>();
                        typeMap.put("id", ev.getEventType().getId());
                        typeMap.put("name", ev.getEventType().getName());
                        map.put("eventType", typeMap);
                    } else {
                        map.put("eventType", null);
                    }

                    // Participants
                    map.put("meresParticipants", ev.getParticipants().stream()
                            .filter(p -> p.getParticipantType() == ParticipantType.MERE && p.getMere() != null)
                            .map(p -> Map.of(
                                    "id", p.getId(),
                                    "nom", p.getMere().getNom(),
                                    "prenom", p.getMere().getPrenom(),
                                    "present", p.getPresent(),
                                    "motif", p.getAbsenceReason()
                            )).toList());

                    map.put("enfantsParticipants", ev.getParticipants().stream()
                            .filter(p -> p.getParticipantType() == ParticipantType.ENFANT && p.getEnfant() != null)
                            .map(p -> Map.of(
                                    "id", p.getId(),
                                    "nom", p.getEnfant().getNom(),
                                    "prenom", p.getEnfant().getPrenom(),
                                    "age", p.getEnfant().getAge(),
                                    "present", p.getPresent(),
                                    "motif", p.getAbsenceReason()
                            )).toList());

                    map.put("famillesParticipants", ev.getParticipants().stream()
                            .filter(p -> p.getParticipantType() == ParticipantType.FAMILLE && p.getFamille() != null)
                            .map(p -> Map.of(
                                    "id", p.getId()
                            )).toList());


                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }


    // --------------------- DELETE ---------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    // --------------------- UPDATE ---------------------
    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Event existingEvent = eventService.getEventById(id)
                    .orElseThrow(() -> new RuntimeException("Event not found"));

            existingEvent.setTitle((String) payload.get("title"));
            existingEvent.setStartDate(LocalDate.parse((String) payload.get("start")));
            existingEvent.setEndDate(LocalDate.parse((String) payload.get("end")));

            Map<String, Object> props = (Map<String, Object>) payload.get("extendedProps");

            // Cible
            // Cible
            List<String> ciblesStr = (List<String>) props.get("cibles");
            if (ciblesStr != null && !ciblesStr.isEmpty()) {
                List<Cible> cibles = new ArrayList<>();
                for (String c : ciblesStr) {
                    cibles.add(Cible.valueOf(c));
                }
                existingEvent.setCibles(cibles);

                // <-- PLACE ICI LE BLOCS AGE MIN/MAX
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
            if (typeMap == null || typeMap.get("id") == null)
                throw new RuntimeException("Event type is required");
            Long typeId = Long.valueOf(typeMap.get("id").toString());
            EventType type = eventTypeRepository.findById(typeId)
                    .orElseThrow(() -> new RuntimeException("Event type not found"));
            existingEvent.setEventType(type);

            // Lieu de l'événement
            String place = (String) props.get("place");
            if (place != null) existingEvent.setPlace(place);

            // Description
            String description = (String) props.getOrDefault("description", existingEvent.getDescription());
            existingEvent.setDescription(description);

            // Fichiers
            List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
            if (files != null) {
                List<EventFile> eventFiles = new ArrayList<>();
                for (Map<String, String> f : files) {
                    EventFile ef = new EventFile();
                    ef.setBase64(f.get("base64"));
                    ef.setType(f.get("type"));
                    ef.setEvent(existingEvent);
                    eventFiles.add(ef);
                }
                existingEvent.setFiles(eventFiles);
            }

            // --------------------- PARTICIPANTS ---------------------
            // Mères
            // Mères
            List<Integer> meresIds = (List<Integer>) props.get("meresParticipants");
            if (meresIds != null) {
                existingEvent.setMereParticipants(eventService.getMeresByIds(meresIds)); // <-- setMereParticipants et non setMeresParticipants
            }

// Enfants
            List<Integer> enfantsIds = (List<Integer>) props.get("enfantsParticipants");
            if (enfantsIds != null) {
                existingEvent.setEnfantsParticipants(eventService.getEnfantsByIds(enfantsIds));
            }

// Familles
            List<Integer> famillesIds = (List<Integer>) props.get("famillesParticipants");
            if (famillesIds != null) {
                existingEvent.setFamilleParticipants(eventService.getFamillesByIds(famillesIds)); // reste ok
            }


            Event saved = eventService.saveEvent(existingEvent);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    @PutMapping("/details/{id}")
    public ResponseEntity<Event> updateEvent1(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Event existingEvent = eventService.getEventById(id)
                    .orElseThrow(() -> new RuntimeException("Event not found"));

            Map<String, Object> props = (Map<String, Object>) payload.get("extendedProps");
            if (props != null) {
                // Description
                if (props.get("description") != null) {
                    existingEvent.setDescription((String) props.get("description"));
                }

                // Fichiers
                List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
                if (files != null) {
                    List<EventFile> eventFiles = new ArrayList<>();
                    for (Map<String, String> f : files) {
                        EventFile ef = new EventFile();
                        ef.setBase64(f.get("base64"));
                        ef.setType(f.get("type"));
                        ef.setEvent(existingEvent);
                        eventFiles.add(ef);
                    }
                    existingEvent.setFiles(eventFiles);
                }

                // Mères participants
                List<Integer> meresIds = (List<Integer>) props.get("meresParticipants");
                if (meresIds != null) {
                    existingEvent.setMereParticipants(eventService.getMeresByIds(meresIds));
                }

                // Enfants participants
                List<Integer> enfantsIds = (List<Integer>) props.get("enfantsParticipants");
                if (enfantsIds != null) {
                    existingEvent.setEnfantsParticipants(eventService.getEnfantsByIds(enfantsIds));
                }

                // Familles participants
                List<Integer> famillesIds = (List<Integer>) props.get("famillesParticipants");
                if (famillesIds != null) {
                    List<Famille> familles = eventService.getFamillesByIds(famillesIds);
                    existingEvent.setFamilleParticipants(familles); // <-- corrigé
                }
            }

            Event saved = eventService.saveEvent(existingEvent);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }



    // --------------------- GET BY TYPE ---------------------
    @GetMapping("/by-type/{typeId}")
    public List<Event> getEventsByType(@PathVariable Long typeId) {
        return eventService.getEventsByType(typeId);
    }
}
