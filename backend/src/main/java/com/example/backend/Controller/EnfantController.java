package com.example.backend.Controller;

import com.example.backend.model.*;
import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.service.EnfantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/enfant")
@CrossOrigin(origins = "http://localhost:3000")
public class EnfantController {

    private final EnfantService enfantService;

    public EnfantController(EnfantService enfantService) {
        this.enfantService = enfantService;
    }

    // 🔹 Ajouter un enfant (JSON)
    @PostMapping
    public Enfant addEnfant(@RequestBody Enfant enfant) {
        if (enfant.getFamille() == null || enfant.getFamille().getId() == null) {
            throw new RuntimeException("Famille non fournie");
        }

        // Appel au service pour sauvegarder l'enfant et lier à la famille
        return enfantService.saveEnfant(enfant, enfant.getFamille().getId());
    }

    // 🔹 Liste des enfants
    @GetMapping
    public List<Enfant> getAllEnfants() {
        return enfantService.getAllEnfants();
    }

    // 🔹 Niveau scolaire
    @PostMapping("/niveauScolaire")
    public NiveauScolaire addNiveauScolaire(@RequestBody NiveauScolaire niveauScolaire) {
        return enfantService.saveNiveauScolaire(niveauScolaire);
    }

    @GetMapping("/niveauScolaire")
    public List<NiveauScolaire> getNiveauScolaires() {
        return enfantService.getNiveauScolaires();
    }

    // 🔹 Enfants par famille
    @GetMapping("/famille/{familleId}")
    public List<Enfant> getEnfantsByFamille(@PathVariable Long familleId) {
        return enfantService.getAllEnfants().stream()
                .filter(e -> e.getFamille() != null && e.getFamille().getId().equals(familleId))
                .toList();
    }
}
