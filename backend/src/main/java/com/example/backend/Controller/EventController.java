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
    public ResponseEntity<List<Event>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
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
            String cibleStr = (String) props.get("cible");
            if (cibleStr == null) throw new RuntimeException("Cible is required");
            event.setCible(Cible.valueOf(cibleStr));

            // Age min/max si ENFANT
            if (event.getCible() == Cible.ENFANT) {
                Object ageMinObj = props.get("ageMin");
                Object ageMaxObj = props.get("ageMax");
                event.setAgeMin(ageMinObj != null ? ((Number) ageMinObj).intValue() : null);
                event.setAgeMax(ageMaxObj != null ? ((Number) ageMaxObj).intValue() : null);
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

            // Photos Base64
            // Fichiers (Base64 + type)
            List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
            if (files != null) {
                List<EventFile> eventFiles = new ArrayList<>();
                for (Map<String, String> f : files) {
                    EventFile ef = new EventFile();
                    ef.setBase64(f.get("base64"));
                    ef.setType(f.get("type")); // ex: "image/png" ou "application/pdf"
                    eventFiles.add(ef);
                }
                event.setFiles(eventFiles);
            }


            // Mères participants
            List<Integer> meresIds = (List<Integer>) props.get("meresParticipants");
            if (meresIds != null) {
                List<Mere> meres = eventService.getMeresByIds(meresIds);
                event.setMeresParticipants(meres);
            }

            // Enfants participants
            List<Integer> enfantsIds = (List<Integer>) props.get("enfantsParticipants");
            if (enfantsIds != null) {
                List<Enfant> enfants = eventService.getEnfantsByIds(enfantsIds);
                event.setEnfantsParticipants(enfants);
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
    public ResponseEntity<Event> getEventById(@PathVariable Long id) {
        return eventService.getEventById(id)
                .map(ResponseEntity::ok)
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
            String cibleStr = (String) props.get("cible");
            if (cibleStr == null) throw new RuntimeException("Cible is required");
            existingEvent.setCible(Cible.valueOf(cibleStr));

            // Age min/max si ENFANT
            if (existingEvent.getCible() == Cible.ENFANT) {
                Object ageMinObj = props.get("ageMin");
                Object ageMaxObj = props.get("ageMax");
                existingEvent.setAgeMin(ageMinObj != null ? ((Number) ageMinObj).intValue() : null);
                existingEvent.setAgeMax(ageMaxObj != null ? ((Number) ageMaxObj).intValue() : null);
            } else {
                existingEvent.setAgeMin(null);
                existingEvent.setAgeMax(null);
            }

            // EventType
            Map<String, Object> typeMap = (Map<String, Object>) props.get("eventType");
            if (typeMap == null || typeMap.get("id") == null)
                throw new RuntimeException("Event type is required");
            Long typeId = Long.valueOf(typeMap.get("id").toString());
            EventType type = eventTypeRepository.findById(typeId)
                    .orElseThrow(() -> new RuntimeException("Event type not found"));
            existingEvent.setEventType(type);

            // Description
            String description = (String) props.getOrDefault("description", existingEvent.getDescription());
            existingEvent.setDescription(description);

            // Photos Base64
            // Fichiers
            List<Map<String, String>> files = (List<Map<String, String>>) props.get("files");
            if (files != null) {
                List<EventFile> eventFiles = new ArrayList<>();
                for (Map<String, String> f : files) {
                    EventFile ef = new EventFile();
                    ef.setBase64(f.get("base64"));
                    ef.setType(f.get("type"));
                    ef.setEvent(existingEvent); // ⚠️ très important !
                    eventFiles.add(ef);
                }
                existingEvent.setFiles(eventFiles);

            }


            // Mères participants
            List<Integer> meresIds = (List<Integer>) props.get("meresParticipants");
            if (meresIds != null) {
                List<Mere> meres = eventService.getMeresByIds(meresIds);
                existingEvent.setMeresParticipants(meres);
            }

            // Enfants participants
            List<Integer> enfantsIds = (List<Integer>) props.get("enfantsParticipants");
            if (enfantsIds != null) {
                List<Enfant> enfants = eventService.getEnfantsByIds(enfantsIds);
                existingEvent.setEnfantsParticipants(enfants);
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
                        ef.setEvent(existingEvent); // ⚠️ très important !
                        eventFiles.add(ef);
                    }
                    existingEvent.setFiles(eventFiles);

                }


                // PDF


                // Mères participants
                List<Integer> meresIds = (List<Integer>) props.get("meresParticipants");
                if (meresIds != null) {
                    existingEvent.setMeresParticipants(eventService.getMeresByIds(meresIds));
                }

                // Enfants participants
                List<Integer> enfantsIds = (List<Integer>) props.get("enfantsParticipants");
                if (enfantsIds != null) {
                    existingEvent.setEnfantsParticipants(eventService.getEnfantsByIds(enfantsIds));
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
