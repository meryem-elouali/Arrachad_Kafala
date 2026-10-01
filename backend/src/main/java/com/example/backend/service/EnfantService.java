package com.example.backend.service;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.NiveauScolaireRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.Repository.EtudeRepository;
import com.example.backend.Repository.EcoleRepository;

import com.example.backend.model.*;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EnfantService {

    private final EnfantRepository enfantRepository;
    private final NiveauScolaireRepository niveauScolaireRepo;
    private final FamilleRepository familleRepository;
    private final EtudeRepository etudeRepository;
    private final EcoleRepository ecoleRepository;

    public EnfantService(
            EnfantRepository enfantRepository,
            NiveauScolaireRepository niveauScolaireRepo,
            FamilleRepository familleRepository,
            EtudeRepository etudeRepository,
            EcoleRepository ecoleRepository
    ) {
        this.enfantRepository = enfantRepository;
        this.niveauScolaireRepo = niveauScolaireRepo;
        this.familleRepository = familleRepository;
        this.etudeRepository = etudeRepository;
        this.ecoleRepository = ecoleRepository;
    }

    // =========================================================
    // ENFANT
    // =========================================================

    public Enfant saveEnfant(
            Enfant enfant,
            Long familleId
    ) {

        Famille famille =
                familleRepository
                        .findById(familleId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Famille non trouvée"
                                )
                        );

        enfant.setFamille(famille);

        if (famille.getEnfants() != null) {
            famille.getEnfants().add(enfant);
        }

        return enfantRepository.save(enfant);
    }

    public List<Enfant> getAllEnfants() {
        return enfantRepository.findAll();
    }

    public Optional<Enfant> getEnfantById(Long id) {
        return enfantRepository.findById(id);
    }

    // ✅ pratique pour les Controllers
    public Enfant getEnfantByIdOrThrow(Long id) {

        return enfantRepository
                .findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Enfant introuvable avec id : " + id
                        )
                );
    }

    public Enfant updateEnfant(Enfant enfant) {
        return enfantRepository.save(enfant);
    }

    // =========================================================
    // NIVEAUX SCOLAIRES
    // =========================================================

    public NiveauScolaire saveNiveauScolaire(
            NiveauScolaire niveauScolaire
    ) {
        return niveauScolaireRepo.save(niveauScolaire);
    }

    public List<NiveauScolaire> getNiveauScolaires() {
        return niveauScolaireRepo.findAll();
    }

    public NiveauScolaire getNiveauScolaireById(Long id) {

        return niveauScolaireRepo
                .findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Niveau scolaire non trouvé"
                        )
                );
    }

    public NiveauScolaire getNiveauById(Long id) {

        return niveauScolaireRepo
                .findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Niveau scolaire introuvable"
                        )
                );
    }

    // =========================================================
    // DERNIER NIVEAU SCOLAIRE
    // =========================================================

    public NiveauScolaire getDernierNiveauScolaire(
            Long enfantId
    ) {

        return etudeRepository
                .findTopByEnfantIdOrderByAnneeScolaireDescIdDesc(
                        enfantId
                )
                .map(Etude::getNiveauScolaire)
                .orElse(null);
    }

    // =========================================================
    // ECOLES
    // =========================================================

    public Ecole getEcoleById(Long id) {

        return ecoleRepository
                .findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "École introuvable"
                        )
                );
    }

    public Ecole saveEcole(Ecole ecole) {
        return ecoleRepository.save(ecole);
    }

    public List<Ecole> getAllEcoles() {
        return ecoleRepository.findAll();
    }
}