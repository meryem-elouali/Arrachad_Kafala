package com.example.backend.service;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.NiveauScolaireRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.model.Enfant;
import com.example.backend.model.Famille;
import com.example.backend.model.NiveauScolaire;
import org.springframework.stereotype.Service;
import java.util.List;

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
}
