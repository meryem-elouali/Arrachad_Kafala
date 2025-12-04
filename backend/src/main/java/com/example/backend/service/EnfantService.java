package com.example.backend.service;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.NiveauScolaireRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.Repository.EtudeRepository;
import com.example.backend.Repository.EcoleRepository;
import com.example.backend.model.*;
import org.springframework.stereotype.Service;

import java.util.List;

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

    // 🔹 Enregistrer un enfant
    public Enfant saveEnfant(Enfant enfant, Long familleId) {
        Famille famille = familleRepository.findById(familleId)
                .orElseThrow(() -> new RuntimeException("Famille non trouvée"));

        enfant.setFamille(famille);
        famille.getEnfants().add(enfant);

        return enfantRepository.save(enfant);
    }

    public List<Enfant> getAllEnfants() {
        return enfantRepository.findAll();
    }

    // 🔹 Niveau scolaire
    public NiveauScolaire saveNiveauScolaire(NiveauScolaire niveauScolaire) {
        return niveauScolaireRepo.save(niveauScolaire);
    }

    public List<NiveauScolaire> getNiveauScolaires() {
        return niveauScolaireRepo.findAll();
    }

    public NiveauScolaire getNiveauScolaireById(Long id) {
        return niveauScolaireRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Niveau scolaire non trouvé"));
    }

    // 🔹 Dernier niveau d'étude
    public NiveauScolaire getDernierNiveauScolaire(Long enfantId) {
        Etude derniereEtude = etudeRepository.findLatestEtudeByEnfantId(enfantId);
        return (derniereEtude != null) ? derniereEtude.getNiveauScolaire() : null;
    }

    public NiveauScolaire getNiveauById(Long id) {
        return niveauScolaireRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Niveau scolaire introuvable"));
    }

    public Ecole getEcoleById(Long id) {
        return ecoleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("École introuvable"));
    }
    // 🔹 Enregistrer une école
    public Ecole saveEcole(Ecole ecole) {
        return ecoleRepository.save(ecole);
    }

    // 🔹 Récupérer toutes les écoles
    public List<Ecole> getAllEcoles() {
        return ecoleRepository.findAll();
    }

}
