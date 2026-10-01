package com.example.backend.Controller;

import com.example.backend.Repository.EtudeRepository;
import com.example.backend.Repository.SpecialiteRepository;
import com.example.backend.dto.EtudeRequest;
import com.example.backend.model.*;
import com.example.backend.service.EnfantService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.http.MediaType;
@RestController
@RequestMapping("/api/etudes")
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:3000"
        },
        allowCredentials = "true"
)
public class EtudeController {

    private final EtudeRepository etudeRepository;

    private final EnfantService enfantService;

    private final SpecialiteRepository specialiteRepository;

    public EtudeController(
            EtudeRepository etudeRepository,
            EnfantService enfantService,
            SpecialiteRepository specialiteRepository
    ) {
        this.etudeRepository = etudeRepository;
        this.enfantService = enfantService;
        this.specialiteRepository = specialiteRepository;
    }

    // =========================================================
    // GET : DERNIERE ETUDE DE CHAQUE ENFANT
    // =========================================================

    @GetMapping("/latest")
    public List<Etude> getLatestEtudes() {

        return etudeRepository.findLatestEtudes();
    }

    // =========================================================
    // GET : HISTORIQUE D'UN ENFANT
    // =========================================================

    @GetMapping("/all/{enfantId}")
    public List<Etude> getAllEtudes(
            @PathVariable Long enfantId
    ) {

        return etudeRepository
                .findAllByEnfantIdOrderByAnneeScolaireDescIdDesc(
                        enfantId
                );
    }

    // =========================================================
    // GET : UNE ETUDE
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<Etude> getEtude(
            @PathVariable Long id
    ) {

        return etudeRepository
                .findById(id)
                .map(ResponseEntity::ok)
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // =========================================================
    // POST
    // =========================================================

    @PostMapping
    public Etude createEtude(
            @RequestBody EtudeRequest request
    ) {

        Etude etude = new Etude();

        etude.setAnneeScolaire(
                request.getAnneeScolaire()
        );

        etude.setNoteSemestre1(
                request.getNoteSemestre1()
        );

        etude.setNoteSemestre2(
                request.getNoteSemestre2()
        );

        etude.setNoteGenerale(
                request.getNoteGenerale()
        );

        etude.setRedoublon(
                request.getRedoublon()
        );

        etude.setDetails(
                request.getDetails()
        );

        // =====================================================
        // ENFANT
        // =====================================================

        if (request.getEnfantId() == null) {
            throw new RuntimeException(
                    "L'enfant est obligatoire"
            );
        }

        Enfant enfant =
                enfantService.getEnfantByIdOrThrow(
                        request.getEnfantId()
                );

        etude.setEnfant(enfant);

        // =====================================================
        // NIVEAU
        // =====================================================

        if (request.getNiveauScolaireId() != null) {

            NiveauScolaire niveau =
                    enfantService.getNiveauById(
                            request.getNiveauScolaireId()
                    );

            etude.setNiveauScolaire(niveau);
        }

        // =====================================================
        // ECOLE
        // =====================================================

        if (request.getEcoleId() != null) {

            Ecole ecole =
                    enfantService.getEcoleById(
                            request.getEcoleId()
                    );

            etude.setEcole(ecole);
        }

        // =====================================================
        // SPECIALITE
        // =====================================================

        if (request.getSpecialiteId() != null) {

            Specialite specialite =
                    specialiteRepository
                            .findById(
                                    request.getSpecialiteId()
                            )
                            .orElseThrow(
                                    () -> new RuntimeException(
                                            "Spécialité introuvable"
                                    )
                            );

            etude.setSpecialite(
                    specialite
            );
        }

        calculerNoteGeneraleSiVide(etude);

        return etudeRepository.save(etude);
    }

    // =========================================================
    // PUT
    // =========================================================

    @PutMapping("/{id}")
    public Etude updateEtude(
            @PathVariable Long id,
            @RequestBody EtudeRequest request
    ) {

        Etude etude =
                etudeRepository
                        .findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Etude introuvable avec id : " + id
                                )
                        );

        // =====================================================
        // DONNEES
        // =====================================================

        etude.setAnneeScolaire(
                request.getAnneeScolaire()
        );

        etude.setNoteSemestre1(
                request.getNoteSemestre1()
        );

        etude.setNoteSemestre2(
                request.getNoteSemestre2()
        );

        etude.setNoteGenerale(
                request.getNoteGenerale()
        );

        etude.setRedoublon(
                request.getRedoublon()
        );

        etude.setDetails(
                request.getDetails()
        );

        // =====================================================
        // ENFANT
        // =====================================================

        if (request.getEnfantId() != null) {

            Enfant enfant =
                    enfantService.getEnfantByIdOrThrow(
                            request.getEnfantId()
                    );

            etude.setEnfant(enfant);
        }

        // =====================================================
        // NIVEAU
        // =====================================================

        if (request.getNiveauScolaireId() != null) {

            NiveauScolaire niveau =
                    enfantService.getNiveauById(
                            request.getNiveauScolaireId()
                    );

            etude.setNiveauScolaire(niveau);

        } else {

            etude.setNiveauScolaire(null);
        }

        // =====================================================
        // ECOLE
        // =====================================================

        if (request.getEcoleId() != null) {

            Ecole ecole =
                    enfantService.getEcoleById(
                            request.getEcoleId()
                    );

            etude.setEcole(ecole);

        } else {

            etude.setEcole(null);
        }

        // =====================================================
        // SPECIALITE
        // =====================================================

        if (request.getSpecialiteId() != null) {

            Specialite specialite =
                    specialiteRepository
                            .findById(
                                    request.getSpecialiteId()
                            )
                            .orElseThrow(
                                    () -> new RuntimeException(
                                            "Spécialité introuvable"
                                    )
                            );

            etude.setSpecialite(specialite);

        } else {

            etude.setSpecialite(null);
        }

        calculerNoteGeneraleSiVide(etude);

        return etudeRepository.save(etude);
    }
    @GetMapping("/annees")
    public List<String> getAnneesScolaires() {
        return etudeRepository.findDistinctAnneesScolaires();
    }
    // =========================================================
    // DELETE
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEtude(
            @PathVariable Long id
    ) {

        if (
                !etudeRepository
                        .existsById(id)
        ) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        etudeRepository.deleteById(
                id
        );

        return ResponseEntity
                .noContent()
                .build();
    }

    // =========================================================
    // CALCUL NOTE GENERALE
    // =========================================================

    private void calculerNoteGeneraleSiVide(
            Etude etude
    ) {

        if (
                etude.getNoteGenerale() == null
                        && etude.getNoteSemestre1() != null
                        && etude.getNoteSemestre2() != null
        ) {

            double moyenne =
                    (
                            etude.getNoteSemestre1()
                                    +
                                    etude.getNoteSemestre2()
                    )
                            / 2.0;

            etude.setNoteGenerale(
                    moyenne
            );
        }
    }
}