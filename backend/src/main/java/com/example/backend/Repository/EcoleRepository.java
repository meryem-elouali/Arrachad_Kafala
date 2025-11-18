package com.example.backend.Repository;

import com.example.backend.model.Ecole;
import com.example.backend.model.NiveauScolaire;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EcoleRepository extends JpaRepository<Ecole, Long> {}