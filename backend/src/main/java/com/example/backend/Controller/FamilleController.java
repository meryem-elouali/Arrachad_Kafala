package com.example.backend.Controller;

import com.example.backend.model.*;
import com.example.backend.service.FamilleService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/famille")
@CrossOrigin(origins = "http://localhost:3000")
public class FamilleController {

    private final FamilleService familleService;

    public FamilleController(FamilleService familleService) {
        this.familleService = familleService;
    }

    // 🔹 Obtenir tous les types de familles
    @GetMapping("/types")
    public List<TypeFamille> getTypes() {
        return familleService.getAllTypes();
    }

    // 🔹 Ajouter un nouveau type de famille
    @PostMapping("/types")
    public TypeFamille addTypeFamille(@RequestBody TypeFamille typeFamille) {
        return familleService.saveTypeFamille(typeFamille);
    }

    // 🔹 Obtenir toutes les habitations
    @GetMapping("/habitations")
    public List<Habitation> getHabitations() {
        return familleService.getAllHabitations();
    }

    // 🔹 Ajouter une nouvelle habitation (👉 nécessaire pour ton frontend)
    @PostMapping("/habitations")
    public Habitation addHabitation(@RequestBody Habitation habitation) {
        return familleService.saveHabitation(habitation);
    }

    // 🔹 Ajouter une famille
    @PostMapping
    public Famille addFamille(@RequestBody Famille famille) {
        return familleService.saveFamille(famille);
    }
}
