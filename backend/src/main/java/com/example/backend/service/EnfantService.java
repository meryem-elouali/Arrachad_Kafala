package com.example.backend.service;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.NiveauScolaireRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.model.Enfant;
import com.example.backend.model.Famille;
import com.example.backend.model.NiveauScolaire;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EnfantService {

    private final EnfantRepository enfantRepository;
    private final NiveauScolaireRepository niveauScolairerepo;
    private final FamilleRepository familleRepository;

    public EnfantService(EnfantRepository enfantRepository,
                         NiveauScolaireRepository niveauScolairerepo,
                         FamilleRepository familleRepository) {
        this.enfantRepository = enfantRepository;
        this.niveauScolairerepo = niveauScolairerepo;
        this.familleRepository = familleRepository;
    }

    // 🔹 Enfants
    public Enfant saveEnfant(Enfant enfant, Long familleId) {
        Famille famille = familleRepository.findById(familleId)
                .orElseThrow(() -> new RuntimeException("Famille non trouvée"));

        enfant.setFamille(famille);

        // Ajouter l'enfant à la liste de la famille
        famille.getEnfants().add(enfant);

        return enfantRepository.save(enfant);
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

    // 🔹 Méthode pour récupérer un NiveauScolaire par ID
    public Optional<NiveauScolaire> getNiveauScolaireById(Long id) {
        return niveauScolairerepo.findById(id);
    }

    // 🔹 Récupérer un enfant par ID
    public Optional<Enfant> getEnfantById(Long id) {
        return enfantRepository.findById(id);
    }
}
