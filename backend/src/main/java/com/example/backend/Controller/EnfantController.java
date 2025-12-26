package com.example.backend.Controller;

import com.example.backend.model.Ecole;
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
import java.util.Map;

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

    @PostMapping
    public ResponseEntity<Enfant> addEnfant(
            @RequestParam("prenom") String prenom,
            @RequestParam("nom") String nom,
            @RequestParam("dateNaissance") String dateNaissance,
            @RequestParam("familleId") Long familleId,
            @RequestParam("niveauscolaireId") Long niveauscolaireId,
            @RequestParam("ecoleId") Long ecoleId,
            @RequestParam(value = "typeMaladie", required = false) String typeMaladie,
            @RequestParam(value = "estMalade", required = false) Boolean estMalade,
            @RequestParam(value = "photoEnfant", required = false) MultipartFile photoEnfant
    ) throws IOException {

        Famille famille = familleRepository.findById(familleId)
                .orElseThrow(() -> new RuntimeException("Famille non trouvée"));

        // 👉 Récupération du niveau scolaire
        NiveauScolaire niveau = enfantService.getNiveauById(niveauscolaireId);

        // 👉 Récupération de l'école
        var ecole = enfantService.getEcoleById(ecoleId);

        Enfant enfant = new Enfant();
        enfant.setPrenom(prenom);
        enfant.setNom(nom);
        enfant.setDateNaissance(dateNaissance);
        enfant.setTypeMaladie(typeMaladie);
        enfant.setEstMalade(estMalade != null ? estMalade : false);
        enfant.setFamille(famille);

        // 👉 Association des relations
        enfantService.getNiveauById(niveauscolaireId);
        enfantService.getEcoleById(ecoleId);


        if (photoEnfant != null && !photoEnfant.isEmpty()) {
            enfant.setPhotoEnfant(photoEnfant.getBytes());
        }

        Enfant savedEnfant = enfantService.saveEnfant(enfant, familleId);


        return ResponseEntity.ok(savedEnfant);
    }
    @PutMapping("/{id}")
    public ResponseEntity<Enfant> updateEnfant(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) throws IOException {

        Enfant enfant = enfantService.getEnfantById(id)
                .orElseThrow(() -> new RuntimeException("Enfant introuvable"));

        if (payload.containsKey("prenom")) enfant.setPrenom((String) payload.get("prenom"));
        if (payload.containsKey("nom")) enfant.setNom((String) payload.get("nom"));
        if (payload.containsKey("dateNaissance")) enfant.setDateNaissance((String) payload.get("dateNaissance"));
        if (payload.containsKey("estMalade")) enfant.setEstMalade((Boolean) payload.get("estMalade"));
        if (payload.containsKey("typeMaladie")) enfant.setTypeMaladie((String) payload.get("typeMaladie"));

        if (payload.containsKey("photoEnfantBase64")) {
            String photoBase64 = (String) payload.get("photoEnfantBase64");
            if (photoBase64 != null && !photoBase64.isEmpty()) {
                enfant.setPhotoEnfant(java.util.Base64.getDecoder().decode(photoBase64));
            }
        }

        // ✅ Gestion null safe pour niveauScolaireId
        Object niveauObj = payload.get("niveauScolaireId");
        if (niveauObj != null) {
            Long niveauId = ((Number) niveauObj).longValue();
            NiveauScolaire niveau = enfantService.getNiveauById(niveauId);
            // mettre à jour la relation si nécessaire
        }

        Enfant updatedEnfant = enfantService.updateEnfant(enfant);

        return ResponseEntity.ok(updatedEnfant);
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
    @GetMapping("/ecole")
    public List<Ecole> getEcoles() {
        return enfantService.getAllEcoles();
    }

    @PostMapping("/ecole")
    public ResponseEntity<Ecole> addEcole(@RequestBody Ecole ecole) {
        return ResponseEntity.ok(enfantService.saveEcole(ecole));
    }


}
