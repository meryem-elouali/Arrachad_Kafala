package com.example.backend.service;

import com.example.backend.Repository.FamilleRepository;
import com.example.backend.Repository.HabitationRepository;
import com.example.backend.Repository.TypeFamilleRepository;
import com.example.backend.model.Famille;
import com.example.backend.model.Habitation;
import com.example.backend.model.TypeFamille;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FamilleService {

    private final FamilleRepository familleRepository;
    private final TypeFamilleRepository typeFamilleRepository;
    private final HabitationRepository habitationRepository;

    public FamilleService(FamilleRepository familleRepository,
                          TypeFamilleRepository typeFamilleRepository,
                          HabitationRepository habitationRepository) {
        this.familleRepository = familleRepository;
        this.typeFamilleRepository = typeFamilleRepository;
        this.habitationRepository = habitationRepository;
    }

    public Famille saveFamille(Famille famille) {
        return familleRepository.save(famille);
    }
    // Dans FamilleService.java
    public TypeFamille saveTypeFamille(TypeFamille typeFamille) {
        return typeFamilleRepository.save(typeFamille);
    }

    public Habitation saveHabitation(Habitation habitation) {
        return habitationRepository.save(habitation);
    }


    public List<Famille> getAllFamilles() {
        return familleRepository.findAll();
    }

    public List<TypeFamille> getAllTypesFamille() {
        return typeFamilleRepository.findAll();
    }

    public List<Habitation> getAllHabitations() {
        return habitationRepository.findAll();
    }
}
