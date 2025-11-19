package com.example.backend.service;

import com.example.backend.Repository.EventRepository;
import com.example.backend.Repository.EventTypeRepository;
import com.example.backend.model.Event;
import com.example.backend.model.EventType;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final EventTypeRepository eventTypeRepository; // <-- ajouter ici

    // Injecter les deux repositories
    public EventService(EventRepository eventRepository, EventTypeRepository eventTypeRepository) {
        this.eventRepository = eventRepository;
        this.eventTypeRepository = eventTypeRepository;
    }

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Optional<Event> getEventById(Long id) {
        return eventRepository.findById(id);
    }

    public Event saveEvent(Event event) {
        // Si tu veux vérifier ou charger le EventType avant de sauver :
        if (event.getEventType() != null && event.getEventType().getId() != null) {
            Optional<EventType> typeOpt = eventTypeRepository.findById(event.getEventType().getId());
            typeOpt.ifPresent(event::setEventType);
        }

        return eventRepository.save(event);
    }

    public void deleteEvent(Long id) {
        eventRepository.deleteById(id);
    }
}
