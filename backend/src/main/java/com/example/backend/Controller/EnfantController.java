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
import java.util.Optional;

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
            @RequestParam(value = "typeMaladie", required = false) String typeMaladie,
            @RequestParam(value = "estMalade", required = false) Boolean estMalade,
            @RequestParam(value = "niveauScolaireId", required = false) Long niveauScolaireId,
            @RequestParam(value = "photoEnfant", required = false) MultipartFile photoEnfant
    ) throws IOException {

        Famille famille = familleRepository.findById(familleId)
                .orElseThrow(() -> new RuntimeException("Famille non trouvée"));

        Enfant enfant = new Enfant();
        enfant.setPrenom(prenom);
        enfant.setNom(nom);
        enfant.setDateNaissance(dateNaissance);
        enfant.setTypeMaladie(typeMaladie);
        enfant.setEstMalade(estMalade != null ? estMalade : false);
        enfant.setFamille(famille);

        if (niveauScolaireId != null) {
            Optional<NiveauScolaire> niveauOpt = enfantService.getNiveauScolaireById(niveauScolaireId);
            enfant.setNiveauscolaire(niveauOpt.orElse(null));
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


    @PutMapping("/{id}")
    public ResponseEntity<Enfant> updateEnfant(
            @PathVariable Long id,
            @RequestParam("prenom") String prenom,
            @RequestParam("nom") String nom,
            @RequestParam("dateNaissance") String dateNaissance,
            @RequestParam(value = "typeMaladie", required = false) String typeMaladie,
            @RequestParam(value = "estMalade", required = false) Boolean estMalade,
            @RequestParam(value = "niveauScolaireId", required = false) Long niveauScolaireId,
            @RequestParam(value = "photoEnfantBase64", required = false) String photoEnfantBase64
    ) throws IOException {

        Enfant enfant = enfantService.getEnfantById(id)
                .orElseThrow(() -> new RuntimeException("Enfant non trouvé"));

        // Mise à jour des champs
        enfant.setPrenom(prenom);
        enfant.setNom(nom);
        enfant.setDateNaissance(dateNaissance);
        enfant.setTypeMaladie(typeMaladie);
        enfant.setEstMalade(estMalade != null ? estMalade : false);

        if (niveauScolaireId != null) {
            Optional<NiveauScolaire> niveauOpt = enfantService.getNiveauScolaireById(niveauScolaireId);
            enfant.setNiveauscolaire(niveauOpt.orElse(null));
        }

        if (photoEnfantBase64 != null && !photoEnfantBase64.isEmpty()) {
            try {
                byte[] photoBytes = java.util.Base64.getDecoder().decode(photoEnfantBase64);
                enfant.setPhotoEnfant(photoBytes);
            } catch (IllegalArgumentException e) {
                // Handle invalid base64
                throw new RuntimeException("Photo invalide");
            }
        }

        Enfant updatedEnfant = enfantService.saveEnfant(enfant, enfant.getFamille().getId());
        return ResponseEntity.ok(updatedEnfant);
    }

}
