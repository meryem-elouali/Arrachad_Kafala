package com.example.backend.service;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.EventRepository;
import com.example.backend.Repository.EventTypeRepository;
import com.example.backend.Repository.MereRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.dto.EventDetailsDTO;
import com.example.backend.model.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final EventTypeRepository eventTypeRepository;
    private final MereRepository mereRepository;
    private final EnfantRepository enfantRepository;
    private final FamilleRepository familleRepository;

    // Injecter tous les repositories
    public EventService(EventRepository eventRepository,
                        EventTypeRepository eventTypeRepository,
                        MereRepository mereRepository,
                        EnfantRepository enfantRepository,
                        FamilleRepository familleRepository) {
        this.eventRepository = eventRepository;
        this.eventTypeRepository = eventTypeRepository;
        this.mereRepository = mereRepository;
        this.enfantRepository = enfantRepository;
        this.familleRepository = familleRepository;
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
    // MERES
    public List<Mere> getMeresByIds(List<Integer> ids) {
        List<Long> longIds = ids.stream().map(Integer::longValue).collect(Collectors.toList());
        return mereRepository.findAllById(longIds);
    }

    public Mere getMereById(Long id) {
        return mereRepository.findById(Long.valueOf(id))
                .orElseThrow(() -> new RuntimeException("Mere not found"));
    }

    // ENFANTS
    public List<Enfant> getEnfantsByIds(List<Integer> ids) {
        List<Long> longIds = ids.stream().map(Integer::longValue).collect(Collectors.toList());
        return enfantRepository.findAllById(longIds);
    }

    public Enfant getEnfantById(Long id) {
        return enfantRepository.findById(Long.valueOf(id))
                .orElseThrow(() -> new RuntimeException("Enfant not found"));
    }

    // FAMILLES
    public List<Famille> getFamillesByIds(List<Integer> ids) {
        List<Long> longIds = ids.stream().map(Integer::longValue).collect(Collectors.toList());
        return familleRepository.findAllById(longIds);
    }

    public Famille getFamilleById(Long id) {
        return familleRepository.findById(Long.valueOf(id))
                .orElseThrow(() -> new RuntimeException("Famille not found"));
    }


    public Optional<EventDetailsDTO> getEventDetailsById(Long id) {
        Optional<Event> eventOpt = eventRepository.findEventWithDetailsById(id);
        if (eventOpt.isEmpty()) return Optional.empty();

        Event event = eventOpt.get();
        List<EventParticipant> participants = eventRepository.findParticipantsByEventId(id);

        // MERES
        List<Map<String, Object>> meresParticipants = participants.stream()
                .filter(p -> p.getParticipantType() == ParticipantType.MERE && p.getMere() != null)
                .map(p -> Map.<String, Object>of(
                        "id", (Object) p.getMere().getId(),
                        "nom", (Object) p.getMere().getNom(),
                        "prenom", (Object) p.getMere().getPrenom(),
                        "present", (Object) p.getPresent(),
                        "motif", (Object) p.getAbsenceReason()
                ))
                .collect(Collectors.toList());

        // ENFANTS
        List<Map<String, Object>> enfantsParticipants = participants.stream()
                .filter(p -> p.getParticipantType() == ParticipantType.ENFANT && p.getEnfant() != null)
                .map(p -> Map.<String, Object>of(
                        "id", (Object) p.getEnfant().getId(),
                        "nom", (Object) p.getEnfant().getNom(),
                        "prenom", (Object) p.getEnfant().getPrenom(),
                        "present", (Object) p.getPresent(),
                        "motif", (Object) p.getAbsenceReason()
                ))
                .collect(Collectors.toList());

        // FAMILLES
        List<Map<String, Object>> famillesParticipants = participants.stream()
                .filter(p -> p.getParticipantType() == ParticipantType.FAMILLE && p.getFamille() != null)
                .map(p -> Map.<String, Object>of(
                        "id", (Object) p.getFamille().getId(),
                        "present", (Object) p.getPresent(),
                        "motif", (Object) p.getAbsenceReason()
                ))
                .collect(Collectors.toList());

        // FILES
        List<Map<String, Object>> files = event.getFiles().stream()
                .map(f -> Map.<String, Object>of(
                        "base64", (Object) f.getBase64(),
                        "type", (Object) f.getType()
                ))
                .collect(Collectors.toList());

        // EventType
        Map<String, Object> eventTypeMap = null;
        if (event.getEventType() != null) {
            eventTypeMap = Map.<String, Object>of(
                    "id", (Object) event.getEventType().getId(),
                    "name", (Object) event.getEventType().getName()
            );
        }

        // Construire le DTO
        EventDetailsDTO dto = new EventDetailsDTO(
                event.getId(),
                event.getTitle(),
                event.getStartDate(),
                event.getEndDate(),
                event.getCalendarLevel(),
                event.getPlace(),
                event.getAgeMin(),
                event.getAgeMax(),
                event.getCibles() != null ? event.getCibles().stream().map(Enum::name).collect(Collectors.toList()) : null,
                eventTypeMap,
                event.getDescription(),
                files,
                meresParticipants,
                enfantsParticipants,
                famillesParticipants
        );

        return Optional.of(dto);
    }


}
