package com.example.backend.Controller;

import com.example.backend.Repository.EtudeRepository;
import com.example.backend.model.Ecole;
import com.example.backend.model.Enfant;
import com.example.backend.model.Etude;

import com.example.backend.model.NiveauScolaire;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/etudes")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class EtudeController {

    @Autowired
    private EtudeRepository etudeRepository;

    /* ---------------- GET ---------------- */
    @GetMapping("/latest")
    public List<Etude> getLatestEtudes() {
        return etudeRepository.findLatestEtudes();
    }

    @GetMapping("/all/{enfantId}")
    public List<Etude> getAllEtudes(@PathVariable Long enfantId) {
        return etudeRepository.findAllEtudesByEnfantId(enfantId);
    }

    /* ---------------- POST ---------------- */
    @PostMapping
    public Etude createEtude(@RequestBody Etude etude) {
        if (etude.getEnfant() != null && etude.getEnfant().getId() != null) {
            Enfant enfant = new Enfant();
            enfant.setId(etude.getEnfant().getId());
            etude.setEnfant(enfant);
        }

        if (etude.getEcole() != null && etude.getEcole().getId() != null) {
            Ecole ecole = new Ecole();
            ecole.setId(etude.getEcole().getId());
            etude.setEcole(ecole);
        }

        if (etude.getNiveauScolaire() != null && etude.getNiveauScolaire().getId() != null) {
            NiveauScolaire niveau = new NiveauScolaire();
            niveau.setId(etude.getNiveauScolaire().getId());
            etude.setNiveauScolaire(niveau);
        }

        return etudeRepository.save(etude);
    }



    /* ---------------- PUT ---------------- */
    @PutMapping("/{id}")
    public Etude updateEtude(@PathVariable Long id, @RequestBody Etude etudeDetails) {
        Etude etude = etudeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Etude non trouvée avec id : " + id));

        // Mettre à jour les champs
        etude.setAnneeScolaire(etudeDetails.getAnneeScolaire());
        etude.setNiveauScolaire(etudeDetails.getNiveauScolaire());
        etude.setEcole(etudeDetails.getEcole());
        etude.setNoteSemestre1(etudeDetails.getNoteSemestre1());
        etude.setNoteSemestre2(etudeDetails.getNoteSemestre2());
        etude.setRedoublon(etudeDetails.getRedoublon());

        return etudeRepository.save(etude);
    }

    /* ---------------- DELETE ---------------- */
    @DeleteMapping("/{id}")
    public void deleteEtude(@PathVariable Long id) {
        Etude etude = etudeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Etude non trouvée avec id : " + id));
        etudeRepository.delete(etude);
    }
}
