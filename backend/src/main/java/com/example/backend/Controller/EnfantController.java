package com.example.backend.Controller;

import com.example.backend.model.Enfant;
import com.example.backend.model.Famille;
import com.example.backend.model.NiveauScolaire;
import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.service.EnfantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/enfant")
@CrossOrigin(origins = "http://localhost:3000")
public class EnfantController {

    private final EnfantService enfantService;
    private final FamilleRepository familleRepository;

    public EnfantController(EnfantService enfantService, FamilleRepository familleRepository) {
        this.enfantService = enfantService;
        this.familleRepository = familleRepository;
    }

    // 🔹 Ajouter un enfant avec MultipartFile pour la photo
    @PostMapping
    public ResponseEntity<Enfant> addEnfant(
            @RequestParam("prenom") String prenom,
            @RequestParam("nom") String nom,
            @RequestParam("dateNaissance") String dateNaissance,
            @RequestParam("familleId") Long familleId,
            @RequestParam(value = "niveauScolaireId", required = false) Long niveauScolaireId,
            @RequestParam(value = "photoEnfant", required = false) MultipartFile photoEnfant
    ) throws IOException {

        Famille famille = familleRepository.findById(familleId)
                .orElseThrow(() -> new RuntimeException("Famille non trouvée"));

        Enfant enfant = new Enfant();
        enfant.setPrenom(prenom);
        enfant.setNom(nom);
        enfant.setDateNaissance(dateNaissance);
        enfant.setFamille(famille);

        if (niveauScolaireId != null) {
            NiveauScolaire niveau = enfantService.getNiveauScolaireById(niveauScolaireId);
            enfant.setNiveauscolaire(niveau);
        }

        if (photoEnfant != null && !photoEnfant.isEmpty()) {
            enfant.setPhotoEnfant(photoEnfant.getBytes());
        }

        Enfant savedEnfant = enfantService.saveEnfant(enfant, familleId);
        return ResponseEntity.ok(savedEnfant);
    }

    // 🔹 Liste des enfants
    @GetMapping
    public List<Enfant> getAllEnfants() {
        return enfantService.getAllEnfants();
    }

    // 🔹 Liste des niveaux scolaires
    @GetMapping("/niveauScolaire")
    public List<NiveauScolaire> getNiveauScolaires() {
        return enfantService.getNiveauScolaires();
    }
    @PostMapping("/niveauScolaire")
    public ResponseEntity<NiveauScolaire> addNiveauScolaire(@RequestBody NiveauScolaire niveau) {
        NiveauScolaire saved = enfantService.saveNiveauScolaire(niveau);
        return ResponseEntity.ok(saved);
    }

    // 🔹 Enfants par famille
    @GetMapping("/famille/{familleId}")
    public List<Enfant> getEnfantsByFamille(@PathVariable Long familleId) {
        return enfantService.getAllEnfants().stream()
                .filter(e -> e.getFamille() != null && e.getFamille().getId().equals(familleId))
                .toList();
    }
}
