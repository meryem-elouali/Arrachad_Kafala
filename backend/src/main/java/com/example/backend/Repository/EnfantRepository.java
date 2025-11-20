package com.example.backend.Repository;

import com.example.backend.model.Enfant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnfantRepository extends JpaRepository<Enfant, Long> {

    // Optionnel : rechercher tous les enfants d'une famille
    List<Enfant> findByFamilleId(Long familleId);

    // Optionnel : rechercher un enfant par son nom
    List<Enfant> findByNom(String nom);
    // Rechercher les enfants par tranche d'âge


}
