package com.example.backend.Repository;

import com.example.backend.model.Event;
import com.example.backend.model.EventParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByEventTypeId(Long eventTypeId);

    // Récupère l'événement de base (sans participants pour éviter la complexité)
    @Query("SELECT e FROM Event e LEFT JOIN FETCH e.eventType et LEFT JOIN FETCH e.files WHERE e.id = :id")
    Optional<Event> findEventWithDetailsById(@Param("id") Long id);

    // Récupère les participants séparément (plus simple et fiable)
    @Query("SELECT p FROM EventParticipant p LEFT JOIN FETCH p.mere LEFT JOIN FETCH p.enfant LEFT JOIN FETCH p.famille WHERE p.event.id = :eventId")
    List<EventParticipant> findParticipantsByEventId(@Param("eventId") Long eventId);
}