package com.example.backend.Repository;

import com.example.backend.model.Etude;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EtudeRepository
        extends JpaRepository<Etude, Long> {

    // =========================================================
    // TOUTES LES ETUDES D'UN ENFANT
    // =========================================================

    List<Etude>
    findAllByEnfantIdOrderByAnneeScolaireDescIdDesc(
            Long enfantId
    );

    // =========================================================
    // DERNIERE ETUDE D'UN ENFANT
    // =========================================================

    Optional<Etude>
    findTopByEnfantIdOrderByAnneeScolaireDescIdDesc(
            Long enfantId
    );

    // =========================================================
    // COMPATIBILITE AVEC TON ANCIEN CODE
    //
    // Permet de continuer à utiliser :
    // findLatestEtudeByEnfantId(id)
    // dans EnfantController
    // =========================================================

    default Etude findLatestEtudeByEnfantId(Long enfantId) {

        return findTopByEnfantIdOrderByAnneeScolaireDescIdDesc(
                enfantId
        ).orElse(null);
    }

    // =========================================================
    // DERNIERE ETUDE DE CHAQUE ENFANT
    // =========================================================

    @Query("""
        SELECT e
        FROM Etude e
        WHERE NOT EXISTS (
            SELECT e2
            FROM Etude e2
            WHERE e2.enfant.id = e.enfant.id
              AND (
                    e2.anneeScolaire > e.anneeScolaire
                    OR (
                        e2.anneeScolaire = e.anneeScolaire
                        AND e2.id > e.id
                    )
                  )
        )
        ORDER BY e.enfant.id
    """)
    List<Etude> findLatestEtudes();
    @Query("""
    SELECT DISTINCT e.anneeScolaire
    FROM Etude e
    WHERE e.anneeScolaire IS NOT NULL
      AND TRIM(e.anneeScolaire) <> ''
    ORDER BY e.anneeScolaire DESC
""")
    List<String> findDistinctAnneesScolaires();
}