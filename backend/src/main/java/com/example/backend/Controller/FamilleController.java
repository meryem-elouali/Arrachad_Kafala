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
    // 🔹 Retourner toutes les familles avec enfants, mère et père
    @GetMapping
    public List<Famille> getAllFamilles() {
        return familleService.getAllFamilles();
    }
    // 🔹 Obtenir une famille par son ID (avec enfants, mère et père)
    @GetMapping("/{id}")
    public Famille getFamilleById(@PathVariable Long id) {
        return familleService.getFamilleById(id);
    }
    // 🔹 Mettre à jour une famille existante
    @PutMapping("/{id}")
    public Famille updateFamille(@PathVariable Long id, @RequestBody Famille updatedFamille) {
        // Récupérer la famille existante
        Famille existingFamille = familleService.getFamilleById(id);
        if (existingFamille == null) {
            throw new RuntimeException("Famille introuvable avec l'id : " + id);
        }

        // Mettre à jour les champs
        existingFamille.setAdresseFamille(updatedFamille.getAdresseFamille());
        existingFamille.setPhone(updatedFamille.getPhone());
        existingFamille.setDateInscription(updatedFamille.getDateInscription());
        existingFamille.setPossedeMalade(updatedFamille.getPossedeMalade());
        existingFamille.setPersonneMalade(updatedFamille.getPersonneMalade());
        existingFamille.setTypeFamille(updatedFamille.getTypeFamille());
        existingFamille.setHabitationFamille(updatedFamille.getHabitationFamille());

        // Sauvegarder la famille mise à jour
        return familleService.saveFamille(existingFamille);
    }


}
