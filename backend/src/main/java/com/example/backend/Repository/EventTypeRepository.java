package com.example.backend.Repository;

import com.example.backend.model.EventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EventTypeRepository extends JpaRepository<EventType, Long> {
    // Tu peux ajouter des méthodes personnalisées si besoin
}
