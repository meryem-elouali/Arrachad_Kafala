package com.example.backend.Repository;

import com.example.backend.model.NiveauScolaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NiveauScolaireRepository extends JpaRepository<NiveauScolaire, Long> {}