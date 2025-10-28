package com.example.backend.Controller;

import com.example.backend.model.Mere;
import com.example.backend.Repository.MereRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/mere")
@CrossOrigin(origins = "http://localhost:3000")
public class MereController {

    private final MereRepository mereRepository;
    public MereController(MereRepository mereRepository) { this.mereRepository = mereRepository; }

    @PostMapping
    public ResponseEntity<Mere> addMere(
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
            @RequestParam(value = "photoMere", required = false) MultipartFile photoMere
    ) throws IOException {

        Mere mere = new Mere();
        mere.setNom(nom);
        mere.setPrenom(prenom);
        mere.setCin(cin);
        mere.setPhone(phone);
        mere.setVilleNaissance(villeNaissance);
        mere.setDateNaissance(dateNaissance);
        mere.setDateDeces(dateDeces);
        mere.setTypeMaladie(typeMaladie);
        mere.setTypeTravail(typeTravail);
        mere.setEstDecedee(estDecedee != null ? estDecedee : false);
        mere.setEstMalade(estMalade != null ? estMalade : false);
        mere.setEstTravaille(estTravaille != null ? estTravaille : false);
        if(photoMere != null && !photoMere.isEmpty()) {
            mere.setPhotoMere(photoMere.getOriginalFilename());
        }

        return ResponseEntity.ok(mereRepository.save(mere));
    }
}
