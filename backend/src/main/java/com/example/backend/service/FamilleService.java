package com.example.backend.service;

import com.example.backend.Repository.*;
import com.example.backend.model.*;
import org.springframework.stereotype.Service;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FamilleService {

    private final FamilleRepository familleRepo;
    private final MereRepository mereRepo;
    private final PereRepository pereRepo;
    private final TypeFamilleRepository typeRepo;
    private final HabitationRepository habitationRepo;
    private final EnfantRepository enfantRepo; // ajouter ici

    public FamilleService(FamilleRepository familleRepo, MereRepository mereRepo, PereRepository pereRepo,
                          TypeFamilleRepository typeRepo, HabitationRepository habitationRepo,
                          EnfantRepository enfantRepo) {  // ajouter ici
        this.familleRepo = familleRepo;
        this.mereRepo = mereRepo;
        this.pereRepo = pereRepo;
        this.typeRepo = typeRepo;
        this.habitationRepo = habitationRepo;
        this.enfantRepo = enfantRepo; // initialiser
    }
    @Transactional
    public Famille saveFamille(Famille famille) {
        // Gestion mère
        if (famille.getMere() != null) {
            if (famille.getMere().getId() != null) {
                Mere mere = mereRepo.findById(famille.getMere().getId())
                        .orElseThrow(() -> new RuntimeException("Mère non trouvée"));
                famille.setMere(mere);
            } else {
                mereRepo.save(famille.getMere());
            }
        }

        // Gestion père
        if (famille.getPere() != null) {
            if (famille.getPere().getId() != null) {
                Pere pere = pereRepo.findById(famille.getPere().getId())
                        .orElseThrow(() -> new RuntimeException("Père non trouvé"));
                famille.setPere(pere);
            } else {
                pereRepo.save(famille.getPere());
            }
        }

        // Gestion enfants
        if (famille.getEnfants() != null) {
            for (Enfant enfant : famille.getEnfants()) {
                enfant.setFamille(famille); // lier l'enfant à la famille
                enfantRepo.save(enfant);
            }
        }

        return familleRepo.save(famille);
    }

    public List<TypeFamille> getAllTypes() {
        return typeRepo.findAll();
    }

    public List<Habitation> getAllHabitations() {
        return habitationRepo.findAll();
    }

    public TypeFamille saveTypeFamille(TypeFamille typeFamille) {
        return typeRepo.save(typeFamille);
    }


    public Habitation saveHabitation(Habitation habitation) {
        return habitationRepo.save(habitation);
    }
}
