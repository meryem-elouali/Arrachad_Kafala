package com.example.backend.Repository;

import com.example.backend.model.FonctionLajna;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FonctionLajnaRepository extends JpaRepository<FonctionLajna, Long> {
    Optional<FonctionLajna> findByNom(String nom);
}