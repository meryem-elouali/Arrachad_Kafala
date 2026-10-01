package com.example.backend.Repository;

import com.example.backend.model.Specialite;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpecialiteRepository
        extends JpaRepository<Specialite, Long> {
}