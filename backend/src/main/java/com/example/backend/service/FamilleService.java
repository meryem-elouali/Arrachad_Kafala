package com.example.backend.service;

import com.example.backend.Repository.*;
import com.example.backend.model.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class FamilleService {

    private final FamilleRepository familleRepo;
    private final MereRepository mereRepo;
    private final PereRepository pereRepo;
    private final TypeFamilleRepository typeRepo;
    private final HabitationRepository habitationRepo;

    public FamilleService(FamilleRepository familleRepo, MereRepository mereRepo, PereRepository pereRepo,
                          TypeFamilleRepository typeRepo, HabitationRepository habitationRepo) {
        this.familleRepo = familleRepo;
        this.mereRepo = mereRepo;
        this.pereRepo = pereRepo;
        this.typeRepo = typeRepo;
        this.habitationRepo = habitationRepo;
    }

    @Transactional
    public Famille saveFamille(Famille famille) {
        // 🔹 Gestion mère
        if (famille.getMere() != null) {
            if (famille.getMere().getId() != null) {
                Mere mere = mereRepo.findById(famille.getMere().getId())
                        .orElseThrow(() -> new RuntimeException("Mère non trouvée"));
                famille.setMere(mere);
            } else {
                Mere mere = mereRepo.save(famille.getMere());
                famille.setMere(mere);
            }
        }

        // 🔹 Gestion père
        if (famille.getPere() != null) {
            if (famille.getPere().getId() != null) {
                Pere pere = pereRepo.findById(famille.getPere().getId())
                        .orElseThrow(() -> new RuntimeException("Père non trouvé"));
                famille.setPere(pere);
            } else {
                Pere pere = pereRepo.save(famille.getPere());
                famille.setPere(pere);
            }
        }

        // 🔹 Gestion des enfants
        if (famille.getEnfants() != null) {
            famille.getEnfants().forEach(enfant -> enfant.setFamille(famille));
        }

        // 🔹 Sauvegarde finale de la famille (cascade s'occupe des enfants)
        return familleRepo.save(famille);
    }


    public List<TypeFamille> getAllTypes() {
        return typeRepo.findAll();
    }

    public TypeFamille saveTypeFamille(TypeFamille typeFamille) {
        return typeRepo.save(typeFamille);
    }

    public List<Habitation> getAllHabitations() {
        return habitationRepo.findAll();
    }

    public Habitation saveHabitation(Habitation habitation) {
        return habitationRepo.save(habitation);
    }

    @Transactional(readOnly = true)
    public List<Famille> getAllFamilles() {
        return familleRepo.findAllWithRelations(); // ✅ chargement avec mère, père et enfants
    }
    @Transactional(readOnly = true)
    public Famille getFamilleById(Long id) {
        return familleRepo.findByIdWithRelations(id); // ✅ utilise maintenant la requête avec JOIN FETCH
    }


}
