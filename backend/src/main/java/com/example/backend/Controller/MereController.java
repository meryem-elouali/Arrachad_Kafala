package com.example.backend.Controller;

import com.example.backend.model.Mere;
import com.example.backend.service.MereService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/mere")
@CrossOrigin(origins = "http://localhost:3000")
public class MereController {

    private final MereService mereService;

    public MereController(MereService mereService) {
        this.mereService = mereService;
    }

    @PostMapping
    public ResponseEntity<Mere> addMere(
            @RequestParam("nom") String nom,
            @RequestParam("prenom") String prenom,
            @RequestParam(value = "cin", required = false) String cin,
            @RequestParam(value = "phone", required = false) Integer phone,
            @RequestParam(value = "villeNaissance", required = false) String villeNaissance,
            @RequestParam(value = "dateNaissance", required = false) String dateNaissance,
            @RequestParam(value = "dateDeces", required = false) String dateDeces,
            @RequestParam(value = "simalade", required = false) Boolean simalade,
            @RequestParam(value = "descmaladie", required = false) String descmaladie,
            @RequestParam(value = "sitravaille", required = false) Boolean sitravaille,
            @RequestParam(value = "desctravaille", required = false) String desctravaille,
            @RequestParam(value = "sideceder", required = false) Boolean sideceder,
            @RequestParam(value = "photo", required = false) MultipartFile photo
    ) {
        try {
            Mere mere = new Mere();
            mere.setNom(nom);
            mere.setPrenom(prenom);
            mere.setCin(cin != null && !cin.isEmpty() ? cin : null);
            mere.setPhone(phone);
            mere.setVillenaissance(villeNaissance != null && !villeNaissance.isEmpty() ? villeNaissance : null);
            mere.setSimalade(Boolean.TRUE.equals(simalade));
            mere.setDescmaladie(descmaladie != null && !descmaladie.isEmpty() ? descmaladie : null);
            mere.setSitravaille(Boolean.TRUE.equals(sitravaille));
            mere.setDesctravaille(desctravaille != null && !desctravaille.isEmpty() ? desctravaille : null);
            mere.setSideceder(Boolean.TRUE.equals(sideceder));

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            if (dateNaissance != null && !dateNaissance.isEmpty()) {
                mere.setDatenaissance(LocalDate.parse(dateNaissance, formatter));
            }
            if (dateDeces != null && !dateDeces.isEmpty()) {
                mere.setDatedeces(LocalDate.parse(dateDeces, formatter));
            }

            if (photo != null && !photo.isEmpty()) {
                mere.setPhoto(photo.getBytes());
            }

            Mere saved = mereService.saveMere(mere);
            return new ResponseEntity<>(saved, HttpStatus.OK);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<Mere>> getAllMeres() {
        return ResponseEntity.ok(mereService.getAllMeres());
    }
}
