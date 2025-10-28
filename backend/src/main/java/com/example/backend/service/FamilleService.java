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
    private final TypeFamilleRepository typeRepo;
    private final HabitationRepository habitationRepo;

    public FamilleService(FamilleRepository familleRepo, MereRepository mereRepo,
                          TypeFamilleRepository typeRepo, HabitationRepository habitationRepo) {
        this.familleRepo = familleRepo;
        this.mereRepo = mereRepo;
        this.typeRepo = typeRepo;
        this.habitationRepo = habitationRepo;
    }

    @Transactional
    public Famille saveFamille(Famille famille) {
        // Si la mère a déjà un id, on la récupère pour l’attacher
        if (famille.getMere() != null && famille.getMere().getId() != null) {
            Mere mere = mereRepo.findById(famille.getMere().getId())
                    .orElseThrow(() -> new RuntimeException("Mère non trouvée"));
            famille.setMere(mere);
        } else if (famille.getMere() != null) {
            // Sinon on la sauvegarde si c'est une nouvelle mère
            mereRepo.save(famille.getMere());
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
