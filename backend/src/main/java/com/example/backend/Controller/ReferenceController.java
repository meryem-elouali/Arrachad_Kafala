package com.example.backend.Controller;

import com.example.backend.model.NiveauScolaire;
import com.example.backend.model.Ecole;
import com.example.backend.Repository.NiveauScolaireRepository;
import com.example.backend.Repository.EcoleRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ReferenceController {

    @Autowired
    private NiveauScolaireRepository niveauScolaireRepository;

    @Autowired
    private EcoleRepository ecoleRepository;

    // Endpoint pour récupérer tous les niveaux
    @GetMapping("/niveaux")
    public List<NiveauScolaire> getAllNiveaux() {
        return niveauScolaireRepository.findAll();
    }

    // Endpoint pour récupérer toutes les écoles
    @GetMapping("/ecoles")
    public List<Ecole> getAllEcoles() {
        return ecoleRepository.findAll();
    }
    // Ajouter un nouveau niveau scolaire
    @PostMapping("/niveaux")
    public NiveauScolaire createNiveau(@RequestBody NiveauScolaire niveau) {
        return niveauScolaireRepository.save(niveau);
    }
    // Ajouter une nouvelle école
    @PostMapping("/ecoles")
    public Ecole createEcole(@RequestBody Ecole ecole) {
        return ecoleRepository.save(ecole);
    }

}
