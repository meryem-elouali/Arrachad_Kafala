package com.example.backend.service;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.NiveauScolaireRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.Repository.EtudeRepository;
import com.example.backend.model.Enfant;
import com.example.backend.model.Famille;
import com.example.backend.model.NiveauScolaire;
import com.example.backend.model.Etude;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EnfantService {

    private final EnfantRepository enfantRepository;
    private final NiveauScolaireRepository niveauScolairerepo;
    private final FamilleRepository familleRepository;
    private final EtudeRepository etudeRepository;

    public EnfantService(EnfantRepository enfantRepository,
                         NiveauScolaireRepository niveauScolairerepo,
                         FamilleRepository familleRepository,
                         EtudeRepository etudeRepository) {
        this.enfantRepository = enfantRepository;
        this.niveauScolairerepo = niveauScolairerepo;
        this.familleRepository = familleRepository;
        this.etudeRepository = etudeRepository;
    }

    // 🔹 Enfants
    public Enfant saveEnfant(Enfant enfant, Long familleId) {
        Famille famille = familleRepository.findById(familleId)
                .orElseThrow(() -> new RuntimeException("Famille non trouvée"));

        enfant.setFamille(famille);
        famille.getEnfants().add(enfant);

        Enfant savedEnfant = enfantRepository.save(enfant);

        // Assigner automatiquement le dernier niveau scolaire
        NiveauScolaire dernierNiveau = getDernierNiveauScolaire(savedEnfant.getId());


        return savedEnfant;
    }

    public List<Enfant> getAllEnfants() {
        return enfantRepository.findAll();
    }

    // 🔹 NiveauScolaire
    public NiveauScolaire saveNiveauScolaire(NiveauScolaire niveauScolaire) {
        return niveauScolairerepo.save(niveauScolaire);
    }

    public List<NiveauScolaire> getNiveauScolaires() {
        return niveauScolairerepo.findAll();
    }

    public NiveauScolaire getNiveauScolaireById(Long id) {
        return niveauScolairerepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Niveau scolaire non trouvé"));
    }

    // 🔹 Récupérer le dernier niveau scolaire depuis les études
    // 🔹 Récupérer le dernier niveau scolaire depuis les études
    public NiveauScolaire getDernierNiveauScolaire(Long enfantId) {
        Etude derniereEtude = etudeRepository.findLatestEtudeByEnfantId(enfantId);
        return (derniereEtude != null) ? derniereEtude.getNiveauScolaire() : null;
    }

}
