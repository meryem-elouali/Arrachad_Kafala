package com.example.backend.Controller;

import com.example.backend.Repository.EventTypeRepository;
import com.example.backend.model.Cible;
import com.example.backend.model.Event;
import com.example.backend.model.EventType;
import com.example.backend.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class EventController {

    private final EventService eventService;
    private final EventTypeRepository eventTypeRepository; // <-- injecté ici

    public EventController(EventService eventService, EventTypeRepository eventTypeRepository) {
        this.eventService = eventService;
        this.eventTypeRepository = eventTypeRepository;
    }

    @GetMapping
    public ResponseEntity<List<Event>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }
    @PostMapping
    public ResponseEntity<Event> createEvent(@RequestBody Map<String, Object> payload) {
        try {
            Event event = new Event();

            event.setTitle((String) payload.get("title"));
            event.setStartDate(LocalDate.parse((String) payload.get("start")));
            event.setEndDate(LocalDate.parse((String) payload.get("end")));

            // 🔹 Récupérer extendedProps avant de l'utiliser
            Map<String, Object> props = (Map<String, Object>) payload.get("extendedProps");

            // 🔹 Calendar level avec valeur par défaut si absent
            String calendarLevel = (String) props.getOrDefault("calendarLevel", "PRIMARY");
            event.setCalendarLevel(calendarLevel);

            // 🔹 Cible
            String cibleStr = (String) props.get("cible");
            if (cibleStr == null) throw new RuntimeException("Cible is required");
            event.setCible(Cible.valueOf(cibleStr));

            // 🔹 Age min/max si ENFANT
            if (event.getCible() == Cible.ENFANT) {
                Object ageMinObj = props.get("ageMin");
                Object ageMaxObj = props.get("ageMax");
                event.setAgeMin(ageMinObj != null ? ((Number) ageMinObj).intValue() : null);
                event.setAgeMax(ageMaxObj != null ? ((Number) ageMaxObj).intValue() : null);
            }

            // 🔹 Event type
            Map<String, Object> typeMap = (Map<String, Object>) props.get("eventType");
            if (typeMap == null || typeMap.get("id") == null)
                throw new RuntimeException("Event type is required");
            Long typeId = Long.valueOf(typeMap.get("id").toString());
            EventType type = eventTypeRepository.findById(typeId)
                    .orElseThrow(() -> new RuntimeException("Event type not found"));
            event.setEventType(type);

            Event saved = eventService.saveEvent(event);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }



    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable Long id) {
        return eventService.getEventById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
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

            Event saved = eventService.saveEvent(existingEvent);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

}
