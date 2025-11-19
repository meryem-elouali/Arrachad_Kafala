package com.example.backend.Controller;

import com.example.backend.Repository.EventTypeRepository;
import com.example.backend.model.EventType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/event-types")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class EventTypeController {

    private final EventTypeRepository eventTypeRepository;

    public EventTypeController(EventTypeRepository eventTypeRepository) {
        this.eventTypeRepository = eventTypeRepository;
    }

    @GetMapping
    public List<EventType> getAllEventTypes() {
        return eventTypeRepository.findAll();
    }
}
