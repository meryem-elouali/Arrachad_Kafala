package com.example.backend.Repository;

import com.example.backend.model.MembreLajna;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MembreLajnaRepository extends JpaRepository<MembreLajna, Long> {
    Optional<MembreLajna> findByUsername(String username);
    long countByFonctionId(Long fonctionId);
}