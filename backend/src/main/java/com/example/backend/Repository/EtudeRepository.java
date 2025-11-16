package com.example.backend.Repository;

import com.example.backend.model.Etude;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EtudeRepository extends JpaRepository<Etude, Long> {

    @Query("SELECT e FROM Etude e " +
            "LEFT JOIN FETCH e.niveauScolaire " +
            "LEFT JOIN FETCH e.enfant " +
            "LEFT JOIN FETCH e.ecole " +
            "WHERE e.anneeScolaire = " +
            "(SELECT MAX(e2.anneeScolaire) FROM Etude e2 WHERE e2.enfant.id = e.enfant.id)")
    List<Etude> findLatestEtudes();



    // 🔹 Récupérer la dernière étude pour un enfant donné
    @Query(value = "SELECT * FROM etudes e1 " +
            "WHERE e1.enfant_id = :enfantId AND e1.annee_scolaire = (" +
            "SELECT MAX(e2.annee_scolaire) FROM etudes e2 WHERE e2.enfant_id = :enfantId)",
            nativeQuery = true)
    Etude findLatestEtudeByEnfantId(Long enfantId);
}
