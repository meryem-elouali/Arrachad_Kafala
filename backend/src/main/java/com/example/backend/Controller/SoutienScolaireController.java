package com.example.backend.Controller;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.SoutienScolaireRepository;

import com.example.backend.dto.SoutienEnfantStat;
import com.example.backend.model.Enfant;
import com.example.backend.model.SoutienScolaire;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import com.example.backend.dto.SoutienScolaireRequest;
@RestController
@RequestMapping("/api/soutiens")
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:3000"
        },
        allowCredentials = "true"
)
public class SoutienScolaireController {

    private final SoutienScolaireRepository repository;

    private final EnfantRepository enfantRepository;

    public SoutienScolaireController(
            SoutienScolaireRepository repository,
            EnfantRepository enfantRepository
    ) {
        this.repository = repository;
        this.enfantRepository = enfantRepository;
    }

    // =========================================================
    // LISTE POUR UN ENFANT
    // =========================================================

    @GetMapping("/all/{enfantId}")
    public List<SoutienScolaire> getByEnfant(
            @PathVariable Long enfantId
    ) {

        return repository
                .findAllByEnfantIdOrderByAnneeScolaireDescIdDesc(
                        enfantId
                );
    }

    // =========================================================
    // TOTAL GLOBAL PAR ANNEE
    // =========================================================

    @GetMapping("/total")
    public Map<String, Object> getTotalGlobal(
            @RequestParam String annee
    ) {

        Double total =
                repository.totalGlobalParAnnee(
                        annee
                );

        return Map.of(
                "annee", annee,
                "total", total != null ? total : 0
        );
    }

    // =========================================================
    // POST
    // =========================================================

    @PostMapping
    public SoutienScolaire create(
            @RequestBody SoutienScolaireRequest request
    ) {

        if (request.getEnfantId() == null) {
            throw new RuntimeException(
                    "L'enfant est obligatoire"
            );
        }

        Enfant enfant = enfantRepository
                .findById(request.getEnfantId())
                .orElseThrow(
                        () -> new RuntimeException(
                                "Enfant introuvable"
                        )
                );

        SoutienScolaire soutien =
                new SoutienScolaire();

        soutien.setEnfant(enfant);

        soutien.setAnneeScolaire(
                request.getAnneeScolaire()
        );

        soutien.setMois(
                request.getMois()
        );

        soutien.setCentre(
                request.getCentre()
        );

        soutien.setIntervenant(
                request.getIntervenant()
        );

        soutien.setMontant(
                request.getMontant() != null
                        ? request.getMontant()
                        : 0.0
        );

        soutien.setEffectue(
                Boolean.TRUE.equals(
                        request.getEffectue()
                )
        );

        return repository.save(soutien);
    }
    // =========================================================
    // PUT
    // =========================================================

    @PutMapping("/{id}")
    public SoutienScolaire update(
            @PathVariable Long id,
            @RequestBody SoutienScolaireRequest request
    ) {

        SoutienScolaire soutien = repository
                .findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Soutien scolaire introuvable"
                        )
                );

        soutien.setAnneeScolaire(
                request.getAnneeScolaire()
        );

        soutien.setMois(
                request.getMois()
        );

        soutien.setCentre(
                request.getCentre()
        );

        soutien.setIntervenant(
                request.getIntervenant()
        );

        soutien.setMontant(
                request.getMontant() != null
                        ? request.getMontant()
                        : 0.0
        );

        soutien.setEffectue(
                Boolean.TRUE.equals(
                        request.getEffectue()
                )
        );

        if (request.getEnfantId() != null) {

            Enfant enfant = enfantRepository
                    .findById(
                            request.getEnfantId()
                    )
                    .orElseThrow(
                            () -> new RuntimeException(
                                    "Enfant introuvable"
                            )
                    );

            soutien.setEnfant(enfant);
        }

        return repository.save(soutien);
    }

    // =========================================================
    // DELETE
    // =========================================================
    @GetMapping("/stats/enfants")
    public List<SoutienEnfantStat> getStatsParEnfant(
            @RequestParam(required = false) String annee
    ) {

        String anneeFiltre =
                annee == null
                        || annee.isBlank()
                        || "all".equalsIgnoreCase(annee)
                        ? null
                        : annee;

        return repository.statsParEnfant(
                anneeFiltre
        );
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id
    ) {

        if (!repository.existsById(id)) {

            return ResponseEntity.notFound().build();
        }

        repository.deleteById(id);

        return ResponseEntity.noContent().build();
    }

    // =========================================================
    // HELPER
    // =========================================================

    private void appliquerEnfant(
            SoutienScolaire soutien
    ) {

        if (
                soutien.getEnfant() == null
                        || soutien.getEnfant().getId() == null
        ) {

            throw new RuntimeException(
                    "L'enfant est obligatoire"
            );
        }

        Enfant enfant =
                enfantRepository
                        .findById(
                                soutien.getEnfant().getId()
                        )
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Enfant introuvable"
                                )
                        );

        soutien.setEnfant(enfant);
    }
}