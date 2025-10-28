package com.example.backend.service;

import com.example.backend.Repository.*;
import com.example.backend.model.*;
import org.springframework.stereotype.Service;
import java.util.List;

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

    public Famille saveFamille(Famille famille) {
        if (famille.getMere() != null) {
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

    // ✅ AJOUTER CETTE MÉTHODE
    public Habitation saveHabitation(Habitation habitation) {
        return habitationRepo.save(habitation);
    }
}
