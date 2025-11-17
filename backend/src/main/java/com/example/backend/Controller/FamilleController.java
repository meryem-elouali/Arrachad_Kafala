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

            System.out.println("Updating family ID: " + id);  // Debug log
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
    @PutMapping("/{id}/mere")
    public Mere updateMere(@PathVariable Long id, @RequestBody Mere updatedMere) {
        // Récupérer la famille existante
        System.out.println("Données reçues pour mise à jour : " + updatedMere);

        Famille famille = familleService.getFamilleById(id);
        if (famille == null) {
            throw new RuntimeException("Famille introuvable avec l'id : " + id);
        }

        Mere mere = famille.getMere();
        if (mere == null) {
            // Si la mère n'existe pas, on crée une nouvelle instance
            mere = new Mere();
            famille.setMere(mere);
        }

        // Mettre à jour les champs de la mère
        mere.setNom(updatedMere.getNom());
        mere.setPrenom(updatedMere.getPrenom());
        mere.setPhone(updatedMere.getPhone());
        mere.setEstMalade(updatedMere.getEstMalade());
        mere.setTypeMaladie(updatedMere.getTypeMaladie());
        mere.setEstTravaille(updatedMere.getEstTravaille());
        mere.setTypeTravail(updatedMere.getTypeTravail());
        mere.setPhotoMere(updatedMere.getPhotoMere());
        mere.setEstDecedee(updatedMere.getEstDecedee());
        mere.setDateDeces(updatedMere.getDateDeces());
        if (updatedMere.getEstDecedee() != null && updatedMere.getEstDecedee()) {
            mere.setPhone(null);
            mere.setEstMalade(false);
            mere.setTypeMaladie(null);
            mere.setEstTravaille(false);
            mere.setTypeTravail(null);
        } else {
            mere.setPhone(updatedMere.getPhone());
            mere.setEstMalade(updatedMere.getEstMalade());
            mere.setTypeMaladie(updatedMere.getTypeMaladie());
            mere.setEstTravaille(updatedMere.getEstTravaille());
            mere.setTypeTravail(updatedMere.getTypeTravail());
        }
        // Sauvegarder la famille avec la mère mise à jour
        familleService.saveFamille(famille);

        return mere;
    }
    @PutMapping("/{id}/pere")
    public Pere updatePere(@PathVariable Long id, @RequestBody Pere updatedPere) {
        // Récupérer la famille existante
        System.out.println("Données reçues pour mise à jour : " + updatedPere);

        Famille famille = familleService.getFamilleById(id);
        if (famille == null) {
            throw new RuntimeException("Famille introuvable avec l'id : " + id);
        }

        Pere pere = famille.getPere();
        if (pere == null) {
            // Si la mère n'existe pas, on crée une nouvelle instance
            pere = new Pere();
            famille.setPere(pere);
        }

        // Mettre à jour les champs de la mère
        pere.setNom(updatedPere.getNom());
        pere.setPrenom(updatedPere.getPrenom());
        pere.setPhone(updatedPere.getPhone());
        pere.setEstMalade(updatedPere.getEstMalade());
        pere.setTypeMaladie(updatedPere.getTypeMaladie());
        pere.setEstTravaille(updatedPere.getEstTravaille());
        pere.setTypeTravail(updatedPere.getTypeTravail());
        pere.setPhotoPere(updatedPere.getPhotoPere());
        pere.setEstDecedee(updatedPere.getEstDecedee());
        pere.setDateDeces(updatedPere.getDateDeces());
        if (updatedPere.getEstDecedee() != null && updatedPere.getEstDecedee()) {
            pere.setPhone(null);
            pere.setEstMalade(false);
            pere.setTypeMaladie(null);
            pere.setEstTravaille(false);
            pere.setTypeTravail(null);
        } else {
            pere.setPhone(updatedPere.getPhone());
            pere.setEstMalade(updatedPere.getEstMalade());
            pere.setTypeMaladie(updatedPere.getTypeMaladie());
            pere.setEstTravaille(updatedPere.getEstTravaille());
            pere.setTypeTravail(updatedPere.getTypeTravail());
        }
        // Sauvegarder la famille avec la mère mise à jour
        familleService.saveFamille(famille);

        return pere;
    }

}
