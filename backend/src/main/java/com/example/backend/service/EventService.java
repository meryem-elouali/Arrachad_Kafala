package com.example.backend.service;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.EventRepository;
import com.example.backend.Repository.EventTypeRepository;
import com.example.backend.Repository.MereRepository;
import com.example.backend.model.Enfant;
import com.example.backend.model.Event;
import com.example.backend.model.EventType;
import com.example.backend.model.Mere;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final EventTypeRepository eventTypeRepository;
    private final MereRepository mereRepository;
    private final EnfantRepository enfantRepository;

    // Injecter tous les repositories
    public EventService(EventRepository eventRepository,
                        EventTypeRepository eventTypeRepository,
                        MereRepository mereRepository,
                        EnfantRepository enfantRepository) {
        this.eventRepository = eventRepository;
        this.eventTypeRepository = eventTypeRepository;
        this.mereRepository = mereRepository;
        this.enfantRepository = enfantRepository;
    }

    // --------------------- EVENTS ---------------------
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Optional<Event> getEventById(Long id) {
        return eventRepository.findById(id);
    }

    @Transactional
    public Event saveEvent(Event event) {
        // Charger EventType avant de sauver
        if (event.getEventType() != null && event.getEventType().getId() != null) {
            Optional<EventType> typeOpt = eventTypeRepository.findById(event.getEventType().getId());
            typeOpt.ifPresent(event::setEventType);
        }

        return eventRepository.save(event);
    }

    public void deleteEvent(Long id) {
        eventRepository.deleteById(id);
    }

    public List<Event> getEventsByType(Long typeId) {
        return eventRepository.findByEventTypeId(typeId);
    }

    // --------------------- PARTICIPANTS ---------------------
    public List<Mere> getMeresByIds(List<Integer> ids) {
        List<Long> longIds = ids.stream()
                .map(Integer::longValue)
                .toList(); // ou collect(Collectors.toList())
        return mereRepository.findAllById(longIds);
    }

    public List<Enfant> getEnfantsByIds(List<Integer> ids) {
        List<Long> longIds = ids.stream()
                .map(Integer::longValue)
                .toList();
        return enfantRepository.findAllById(longIds);
    }

}
