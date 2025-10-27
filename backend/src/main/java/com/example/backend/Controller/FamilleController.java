package com.example.backend.Controller;

import com.example.backend.model.Famille;
import com.example.backend.model.Habitation;
import com.example.backend.model.TypeFamille;
import com.example.backend.service.FamilleService;
import org.springframework.http.ResponseEntity;
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

    @PostMapping
    public ResponseEntity<Famille> addFamille(@RequestBody Famille famille) {
        Famille savedFamille = familleService.saveFamille(famille);
        return ResponseEntity.ok(savedFamille);
    }

    @GetMapping
    public ResponseEntity<List<Famille>> getFamilles() {
        return ResponseEntity.ok(familleService.getAllFamilles());
    }

    // Récupérer tous les types de famille
    @GetMapping("/types")
    public ResponseEntity<List<TypeFamille>> getTypesFamille() {
        return ResponseEntity.ok(familleService.getAllTypesFamille());
    }

    // Récupérer toutes les habitations
    @GetMapping("/habitations")
    public ResponseEntity<List<Habitation>> getHabitations() {
        return ResponseEntity.ok(familleService.getAllHabitations());
    }
}
