package com.example.backend.Repository;

import com.example.backend.model.FamilyAid;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FamilyAidRepository
        extends JpaRepository<FamilyAid, Long> {

    List<FamilyAid> findByAnneeScolaire(String anneeScolaire);

    List<FamilyAid> findByFamilleIdOrderByDateDepenseDescIdDesc(Long familleId);
}
