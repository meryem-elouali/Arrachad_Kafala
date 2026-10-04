package com.example.backend.Controller;

import com.example.backend.Repository.SpecialiteRepository;
import com.example.backend.model.*;
import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.service.EnfantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import com.example.backend.Repository.EtudeRepository;

@RestController
@RequestMapping("/api/enfant")
@CrossOrigin(origins = "http://localhost:3000")
public class EnfantController {

    private final EnfantService enfantService;
    private final FamilleRepository familleRepository;
    private final EtudeRepository etudeRepo;
    private final SpecialiteRepository specialiteRepo;
    public EnfantController(
            EnfantService enfantService,
            FamilleRepository familleRepository,
            EtudeRepository etudeRepo,
            SpecialiteRepository specialiteRepo
    ) {
        this.enfantService = enfantService;
        this.familleRepository = familleRepository;
        this.etudeRepo = etudeRepo;
        this.specialiteRepo = specialiteRepo;
    }
    @GetMapping("/specialite")
    public List<Specialite> getSpecialites() {
        return specialiteRepo.findAll();
    }

    @PostMapping("/specialite")
    public ResponseEntity<Specialite> addSpecialite(@RequestBody Specialite specialite) {
        return ResponseEntity.ok(specialiteRepo.save(specialite));
    }
    @PostMapping
    public ResponseEntity<Enfant> addEnfant(
            @RequestParam("prenom") String prenom,
            @RequestParam(value = "nom", required = false) String nom,
            @RequestParam(value = "sexe", required = false) String sexe,
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
        enfant.setSexe(sexe);
        enfant.setStatutScolaire(null);
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
        if (payload.containsKey("sexe")) enfant.setSexe((String) payload.get("sexe"));
        appliquerStatutScolaire(enfant, payload);

        if (payload.containsKey("photoEnfantBase64")) {
            String photoBase64 = (String) payload.get("photoEnfantBase64");
            if (photoBase64 != null && !photoBase64.isEmpty()) {
                enfant.setPhotoEnfant(java.util.Base64.getDecoder().decode(photoBase64));
            }
        }

        // Enfant (re)mis en suivi scolaire sans aucune étude : on crée celle de l'année en cours
        // pour pouvoir y enregistrer le niveau / l'établissement choisis.
        if (enfant.estScolarise()
                && etudeRepo.findLatestEtudeByEnfantId(id) == null
                && (idPositif(payload.get("niveauScolaireId")) || idPositif(payload.get("ecoleId")))) {
            Etude nouvelle = new Etude();
            nouvelle.setEnfant(enfant);
            nouvelle.setAnneeScolaire(com.example.backend.service.Valeurs.anneeScolaire(java.time.LocalDate.now()));
            etudeRepo.save(nouvelle);
        }

        // ✅ Gestion null safe pour niveauScolaireId
        Object niveauObj = payload.get("niveauScolaireId");

        if (niveauObj != null) {
            Long niveauId = ((Number) niveauObj).longValue();

            Etude etude = etudeRepo.findLatestEtudeByEnfantId(id);

            if (etude != null && niveauId != 0) {
                NiveauScolaire niveau = enfantService.getNiveauById(niveauId);
                etude.setNiveauScolaire(niveau);
                etudeRepo.save(etude);
            }
        }
        Object ecoleObj = payload.get("ecoleId");

        if (ecoleObj != null) {
            Long ecoleId = ((Number) ecoleObj).longValue();

            Etude etude = etudeRepo.findLatestEtudeByEnfantId(id);

            if (etude != null && ecoleId != 0) {
                Ecole ecole = enfantService.getEcoleById(ecoleId);
                etude.setEcole(ecole);
                etudeRepo.save(etude);
            }
        }
        Object specialiteObj = payload.get("specialiteId");

        if (specialiteObj != null) {
            Long specialiteId = ((Number) specialiteObj).longValue();

            Etude etude = etudeRepo.findLatestEtudeByEnfantId(id);

            if (etude != null && specialiteId != 0) {
                Specialite specialite = specialiteRepo.findById(specialiteId)
                        .orElseThrow(() -> new RuntimeException("Spécialité non trouvée"));
                etude.setSpecialite(specialite);
                etudeRepo.save(etude);
            }
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

    @GetMapping("/{id}/etude")
    public Etude getLatestEtudeByEnfant(@PathVariable Long id) {
        return etudeRepo.findLatestEtudeByEnfantId(id);
    }

    // =========================================================
    // STATUT SCOLAIRE
    //
    // Aucun historique n'est supprimé : seul le statut change.
    // =========================================================
    public static void appliquerStatutScolaire(Enfant enfant, Map<String, Object> payload) {
        if (!payload.containsKey("statutScolaire")) return;

        Object statut = payload.get("statutScolaire");
        try {
            enfant.setStatutScolaire(statut == null ? null : statut.toString());
        } catch (IllegalArgumentException e) {
            throw new com.example.backend.config.HttpError(400, "الوضعية الدراسية غير صالحة");
        }

        if (Enfant.STATUT_ARRETE.equals(enfant.getStatutScolaire())) {
            Object date = payload.get("dateArretEtudes");
            String d = date == null ? "" : date.toString().trim();
            try {
                enfant.setDateArretEtudes(d.isEmpty() ? null : java.time.LocalDate.parse(d.substring(0, Math.min(10, d.length()))));
            } catch (java.time.format.DateTimeParseException e) {
                throw new com.example.backend.config.HttpError(400, "تاريخ التوقف غير صالح");
            }
            if (enfant.getDateArretEtudes() != null && enfant.getDateArretEtudes().isAfter(java.time.LocalDate.now())) {
                throw new com.example.backend.config.HttpError(400, "تاريخ التوقف لا يمكن أن يكون في المستقبل");
            }
            enfant.setMotifArretEtudes(texte(payload.get("motifArretEtudes"), 255));
        }

        if (payload.containsKey("remarqueScolaire")) {
            enfant.setRemarqueScolaire(texte(payload.get("remarqueScolaire"), 1000));
        }
    }

    private static boolean idPositif(Object value) {
        return value instanceof Number n && n.longValue() > 0;
    }

    private static String texte(Object value, int max) {
        if (value == null || value.toString().isBlank()) return null;
        String v = value.toString().trim();
        return v.length() > max ? v.substring(0, max) : v;
    }
}
