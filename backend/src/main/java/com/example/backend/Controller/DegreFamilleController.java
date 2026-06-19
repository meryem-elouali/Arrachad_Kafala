package com.example.backend.Controller;

import com.example.backend.Repository.DegreFamilleRepository;
import com.example.backend.model.DegreFamille;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/degre-famille")
@CrossOrigin(origins = "http://localhost:3000")
public class DegreFamilleController {

    private final DegreFamilleRepository repo;

    public DegreFamilleController(DegreFamilleRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public DegreFamille getDegre() {
        return repo.findAll().stream().findFirst().orElseGet(() -> {
            DegreFamille d = new DegreFamille();
            return repo.save(d);
        });
    }

    @PutMapping
    public DegreFamille updateDegre(@RequestBody DegreFamille degre) {
        DegreFamille existing = repo.findAll().stream().findFirst().orElse(new DegreFamille());

        existing.setPointParEnfant(degre.getPointParEnfant());
        existing.setPointEnfantMalade(degre.getPointEnfantMalade());

        existing.setPointHabitationPropriete(degre.getPointHabitationPropriete());
        existing.setPointHabitationRahn(degre.getPointHabitationRahn());
        existing.setPointHabitationLoyer(degre.getPointHabitationLoyer());

        existing.setPointMereTravailleOui(degre.getPointMereTravailleOui());
        existing.setPointMereTravailleNon(degre.getPointMereTravailleNon());

        existing.setPointMereMaladeOui(degre.getPointMereMaladeOui());
        existing.setPointMereMaladeNon(degre.getPointMereMaladeNon());

        existing.setPointAideFamilleOui(degre.getPointAideFamilleOui());
        existing.setPointAideFamilleNon(degre.getPointAideFamilleNon());

        existing.setPointRevenuMensuelOui(degre.getPointRevenuMensuelOui());
        existing.setPointRevenuMensuelNon(degre.getPointRevenuMensuelNon());

        existing.setPointAutreAssociationOui(degre.getPointAutreAssociationOui());
        existing.setPointAutreAssociationNon(degre.getPointAutreAssociationNon());

        existing.setPointPossedeMaladeOui(degre.getPointPossedeMaladeOui());
        existing.setPointPossedeMaladeNon(degre.getPointPossedeMaladeNon());

        return repo.save(existing);
    }
}