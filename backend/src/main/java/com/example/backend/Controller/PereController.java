package com.example.backend.Controller;

import com.example.backend.Repository.PereRepository;


import com.example.backend.model.Pere;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/pere")
@CrossOrigin(origins = "http://localhost:3000")
public class PereController {

    private final PereRepository pereRepository;
    public PereController(PereRepository pereRepository) { this.pereRepository = pereRepository; }

    @PostMapping
    public ResponseEntity<Pere> addMere(
            @RequestParam("nom") String nom,
            @RequestParam("prenom") String prenom,
            @RequestParam(value = "cin", required = false) String cin,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "villeNaissance", required = false) String villeNaissance,
            @RequestParam(value = "dateNaissance", required = false) String dateNaissance,
            @RequestParam(value = "dateDeces", required = false) String dateDeces,
            @RequestParam(value = "typeMaladie", required = false) String typeMaladie,
            @RequestParam(value = "typeTravail", required = false) String typeTravail,
            @RequestParam(value = "estDecedee", required = false) Boolean estDecedee,
            @RequestParam(value = "estMalade", required = false) Boolean estMalade,
            @RequestParam(value = "estTravaille", required = false) Boolean estTravaille,
            @RequestParam(value = "photoPere", required = false) MultipartFile photoPere
    ) throws IOException {

        Pere pere = new Pere();
        pere.setNom(nom);
        pere.setPrenom(prenom);
        pere.setCin(cin);
        pere.setPhone(phone);
        pere.setVilleNaissance(villeNaissance);
        pere.setDateNaissance(dateNaissance);
        pere.setDateDeces(dateDeces);
        pere.setTypeMaladie(typeMaladie);
        pere.setTypeTravail(typeTravail);
        pere.setEstDecedee(estDecedee != null ? estDecedee : false);
        pere.setEstMalade(estMalade != null ? estMalade : false);
        pere.setEstTravaille(estTravaille != null ? estTravaille : false);
        if(photoPere != null && !photoPere.isEmpty()) {
            pere.setPhotoPere(photoPere.getBytes()); // stocke les données du fichier
        }


        return ResponseEntity.ok(pereRepository.save(pere));
    }
}
