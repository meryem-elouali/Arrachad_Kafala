package com.example.backend.Repository;

import com.example.backend.model.SoutienScolaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.example.backend.dto.SoutienEnfantStat;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SoutienScolaireRepository
        extends JpaRepository<SoutienScolaire, Long> {

    List<SoutienScolaire>
    findAllByEnfantIdOrderByAnneeScolaireDescIdDesc(
            Long enfantId
    );

    // =========================================================
    // TOTAL GLOBAL POUR UNE ANNEE
    //
    // Tous les enfants
    // Toutes les familles
    // Seulement les mois réellement consommés
    // =========================================================

    @Query("""
        SELECT COALESCE(SUM(s.montant), 0)
        FROM SoutienScolaire s
        WHERE s.anneeScolaire = :annee
        AND s.effectue = true
    """)
    Double totalGlobalParAnnee(
            @Param("annee") String annee
    );
    @Query("""
    SELECT
        s.enfant.id AS enfantId,

        COALESCE(
            SUM(s.montant),
            0.0
        ) AS totalConsomme,

        COALESCE(
            SUM(
                COALESCE(
                    s.montantPaye,
                    0.0
                )
            ),
            0.0
        ) AS totalPaye,

        COALESCE(
            SUM(
                CASE
                    WHEN s.montant >
                         COALESCE(s.montantPaye, 0.0)
                    THEN
                        s.montant -
                        COALESCE(s.montantPaye, 0.0)
                    ELSE 0.0
                END
            ),
            0.0
        ) AS totalAutre,

        COUNT(s.id) AS nombrePaiements

    FROM SoutienScolaire s

    WHERE s.effectue = true

      AND s.montant IS NOT NULL

      AND s.montant > 0

      AND (
            :annee IS NULL
            OR s.anneeScolaire = :annee
          )

    GROUP BY s.enfant.id
""")
    List<SoutienEnfantStat> statsParEnfant(
            @Param("annee") String annee
    );
}