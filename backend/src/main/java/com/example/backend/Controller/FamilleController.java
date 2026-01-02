package com.example.backend.Controller;

import com.example.backend.Repository.*;
import com.example.backend.model.*;
import com.example.backend.service.FamilleService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.CriteriaBuilder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/famille")
@CrossOrigin(origins = "http://localhost:3000")
public class FamilleController {

    private final FamilleService familleService;


    private final MereRepository mereRepo;
    private final PereRepository pereRepo;
    private final TypeFamilleRepository typeRepo;
    private final HabitationRepository habitationRepo;
    private final EcoleRepository ecoleRepo;
    private final NiveauScolaireRepository niveauScolaireRepo;
    private final EtudeRepository etudeRepo;

    public FamilleController(FamilleService familleService,
                             MereRepository mereRepo,
                             PereRepository pereRepo,
                             TypeFamilleRepository typeRepo,
                             HabitationRepository habitationRepo,
                             EcoleRepository ecoleRepo,
                             NiveauScolaireRepository niveauScolaireRepo,
                             EtudeRepository etudeRepo) {
        this.familleService = familleService;
        this.mereRepo = mereRepo;
        this.pereRepo = pereRepo;
        this.typeRepo = typeRepo;
        this.habitationRepo = habitationRepo;
        this.ecoleRepo = ecoleRepo;
        this.niveauScolaireRepo = niveauScolaireRepo;
        this.etudeRepo = etudeRepo;
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

    // 🔹 Ajouter une nouvelle habitation
    @PostMapping("/habitations")
    public Habitation addHabitation(@RequestBody Habitation habitation) {
        return familleService.saveHabitation(habitation);
    }

    // 🔹 Ajouter une nouvelle famille (corrigée avec gestion d'erreurs et logging)
    @PostMapping
    public Famille addFamille(
            @RequestParam String adresseFamille,
            @RequestParam String phone,
            @RequestParam String dateInscription,
            @RequestParam Integer nombreEnfants,
            @RequestParam Boolean possedeMalade,
            @RequestParam String personneMalade,
            @RequestParam String typeFamilleId,
            @RequestParam String habitationFamilleId,
            @RequestParam Long mereId,
            @RequestParam Long pereId,
            @RequestParam String enfantsJson,
            @RequestParam String etudesJson,  // <- liste des études pour chaque enfant
            @RequestPart(value = "photoEnfant", required = false) List<MultipartFile> photoEnfants
    ) throws Exception {
        try {
            ObjectMapper objectMapper = new ObjectMapper();

            // 🔹 Récupérer TypeFamille et Habitation
            TypeFamille typeFamille = typeRepo.findById(Long.parseLong(typeFamilleId))
                    .orElseThrow(() -> new RuntimeException("TypeFamille non trouvé"));
            Habitation habitationFamille = habitationRepo.findById(Long.parseLong(habitationFamilleId))
                    .orElseThrow(() -> new RuntimeException("Habitation non trouvée"));

            // 🔹 Désérialiser les enfants depuis le JSON en tant que List<Map> (évite les conflits Jackson)
            List<Map<String, Object>> enfantsData = objectMapper.readValue(enfantsJson, new TypeReference<List<Map<String, Object>>>() {});

            // 🔹 Créer les enfants manuellement
            List<Enfant> enfants = new ArrayList<>();
            for (Map<String, Object> enfantData : enfantsData) {
                Enfant enfant = new Enfant();
                enfant.setNom((String) enfantData.get("nom"));
                enfant.setPrenom((String) enfantData.get("prenom"));
                enfant.setDateNaissance((String) enfantData.get("dateNaissance"));
                enfant.setTypeMaladie((String) enfantData.getOrDefault("typeMaladie", ""));
                enfant.setEstMalade((Boolean) enfantData.getOrDefault("estMalade", false));
                // Ignore les champs comme "niveauscolaire" et "ecole" car ils sont gérés via Etude
                enfants.add(enfant);
            }

            // 🔹 Créer la famille
            Famille famille = new Famille();
            famille.setAdresseFamille(adresseFamille);
            famille.setPhone(phone);
            famille.setDateInscription(dateInscription);
            famille.setNombreEnfants(nombreEnfants);
            famille.setPossedeMalade(possedeMalade);

            famille.setPersonneMalade(personneMalade);
            famille.setTypeFamille(typeFamille);
            famille.setHabitationFamille(habitationFamille);
            famille.setMere(mereRepo.findById(mereId).orElseThrow(() -> new RuntimeException("Mère non trouvée")));
            famille.setPere(pereRepo.findById(pereId).orElseThrow(() -> new RuntimeException("Père non trouvé")));

            // 🔹 Associer les enfants à la famille et gérer les photos
            for (int i = 0; i < enfants.size(); i++) {
                Enfant enfant = enfants.get(i);
                enfant.setFamille(famille);

                if (photoEnfants != null && photoEnfants.size() > i) {
                    MultipartFile photo = photoEnfants.get(i);
                    if (photo != null && !photo.isEmpty()) {
                        enfant.setPhotoEnfant(photo.getBytes());
                    }
                }
            }
            famille.setEnfants(enfants);

            // 🔹 Sauvegarder la famille avec tous les enfants
            Famille savedFamille = familleService.saveFamille(famille);

            // 🔹 Désérialiser les études depuis le JSON en tant que List<Map> (évite les conflits Jackson)
            List<Map<String, Object>> etudesData = objectMapper.readValue(etudesJson, new TypeReference<List<Map<String, Object>>>() {});

            // 🔹 Traiter chaque étude manuellement
            for (int i = 0; i < etudesData.size(); i++) {
                Map<String, Object> etudeData = etudesData.get(i);
                Etude etude = new Etude();

                // Associer l'enfant par index (puisque les enfants sont sauvegardés dans l'ordre)
                if (i < savedFamille.getEnfants().size()) {
                    Enfant enfant = savedFamille.getEnfants().get(i);
                    etude.setEnfant(enfant);
                } else {
                    throw new RuntimeException("Index d'enfant invalide pour l'étude à l'index " + i);
                }

                // Récupérer et définir Ecole
                Long ecoleId = ((Number) etudeData.get("ecoleId")).longValue();
                Ecole ecole = ecoleRepo.findById(ecoleId)
                        .orElseThrow(() -> new RuntimeException("École non trouvée pour ID: " + ecoleId));
                etude.setEcole(ecole);

                // Récupérer et définir NiveauScolaire
                Long niveauId = ((Number) etudeData.get("niveauScolaireId")).longValue();
                NiveauScolaire niveau = niveauScolaireRepo.findById(niveauId)
                        .orElseThrow(() -> new RuntimeException("Niveau scolaire non trouvé pour ID: " + niveauId));
                etude.setNiveauScolaire(niveau);

                // Définir anneeScolaire (si présent dans le JSON)
                if (etudeData.containsKey("anneeScolaire")) {
                    etude.setAnneeScolaire((String) etudeData.get("anneeScolaire"));
                }

                // Sauvegarder l'étude
                etudeRepo.save(etude);
            }

            return savedFamille;

        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
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
        System.out.println("Updating family ID: " + id);
        Famille existingFamille = familleService.getFamilleById(id);
        if (existingFamille == null) {
            throw new RuntimeException("Famille introuvable avec l'id : " + id);
        }

        existingFamille.setAdresseFamille(updatedFamille.getAdresseFamille());
        existingFamille.setPhone(updatedFamille.getPhone());
        existingFamille.setDateInscription(updatedFamille.getDateInscription());
        existingFamille.setPossedeMalade(updatedFamille.getPossedeMalade());
        existingFamille.setPersonneMalade(updatedFamille.getPersonneMalade());
        existingFamille.setTypeFamille(updatedFamille.getTypeFamille());
        existingFamille.setHabitationFamille(updatedFamille.getHabitationFamille());

        return familleService.saveFamille(existingFamille);
    }

    @PutMapping("/{id}/mere")
    public Mere updateMere(@PathVariable Long id, @RequestBody Map<String, Object> payload) {  // <-- CHANGER LE PARAMÈTRE
        System.out.println("Données reçues pour mise à jour : " + payload);

        Famille famille = familleService.getFamilleById(id);
        if (famille == null) {
            throw new RuntimeException("Famille introuvable avec l'id : " + id);
        }

        Mere mere = famille.getMere();
        if (mere == null) {
            mere = new Mere();
            famille.setMere(mere);
        }

        // Champs existants
        if (payload.containsKey("nom")) mere.setNom((String) payload.get("nom"));
        if (payload.containsKey("prenom")) mere.setPrenom((String) payload.get("prenom"));
        if (payload.containsKey("phone")) mere.setPhone((String) payload.get("phone"));
        if (payload.containsKey("cin")) mere.setCin((String) payload.get("cin"));
        if (payload.containsKey("dateNaissance")) mere.setDateNaissance((String) payload.get("dateNaissance"));
        if (payload.containsKey("villeNaissance")) mere.setVilleNaissance((String) payload.get("villeNaissance"));
        if (payload.containsKey("estMalade")) mere.setEstMalade((Boolean) payload.get("estMalade"));
        if (payload.containsKey("typeMaladie")) mere.setTypeMaladie((String) payload.get("typeMaladie"));
        if (payload.containsKey("estTravaille")) mere.setEstTravaille((Boolean) payload.get("estTravaille"));
        if (payload.containsKey("typeTravail")) mere.setTypeTravail((String) payload.get("typeTravail"));
        if (payload.containsKey("estDecedee")) mere.setEstDecedee((Boolean) payload.get("estDecedee"));
        if (payload.containsKey("dateDeces")) mere.setDateDeces((String) payload.get("dateDeces"));

        // ✅ GESTION PHOTO : Décodage Base64
        if (payload.containsKey("photoMere")) {
            String photoBase64 = (String) payload.get("photoMere");
            if (photoBase64 != null && !photoBase64.isEmpty()) {
                mere.setPhotoMere(java.util.Base64.getDecoder().decode(photoBase64));
            }
        }

        // Logique décès (inchangée)
        if (mere.getEstDecedee() != null && mere.getEstDecedee()) {
            mere.setPhone(null);
            mere.setCin(null);
            mere.setDateNaissance(null);
            mere.setVilleNaissance(null);
            mere.setEstMalade(false);
            mere.setTypeMaladie(null);
            mere.setEstTravaille(false);
            mere.setTypeTravail(null);
        }

        familleService.saveFamille(famille);
        return mere;
    }

    @PutMapping("/{id}/pere")
    public Pere updatePere(@PathVariable Long id, @RequestBody Map<String, Object> payload) {  // <-- CHANGER LE PARAMÈTRE
        System.out.println("Données reçues pour mise à jour : " + payload);

        Famille famille = familleService.getFamilleById(id);
        if (famille == null) {
            throw new RuntimeException("Famille introuvable avec l'id : " + id);
        }

        Pere pere = famille.getPere();
        if (pere == null) {
            pere = new Pere();
            famille.setPere(pere);
        }

        // Champs existants
        if (payload.containsKey("nom")) pere.setNom((String) payload.get("nom"));
        if (payload.containsKey("prenom")) pere.setPrenom((String) payload.get("prenom"));
        if (payload.containsKey("phone")) pere.setPhone((String) payload.get("phone"));
        if (payload.containsKey("cin")) pere.setCin((String) payload.get("cin"));
        if (payload.containsKey("dateNaissance")) pere.setDateNaissance((String) payload.get("dateNaissance"));
        if (payload.containsKey("villeNaissance")) pere.setVilleNaissance((String) payload.get("villeNaissance"));
        if (payload.containsKey("estMalade")) pere.setEstMalade((Boolean) payload.get("estMalade"));
        if (payload.containsKey("typeMaladie")) pere.setTypeMaladie((String) payload.get("typeMaladie"));
        if (payload.containsKey("estTravaille")) pere.setEstTravaille((Boolean) payload.get("estTravaille"));
        if (payload.containsKey("typeTravail")) pere.setTypeTravail((String) payload.get("typeTravail"));
        if (payload.containsKey("estDecedee")) pere.setEstDecedee((Boolean) payload.get("estDecedee"));
        if (payload.containsKey("dateDeces")) pere.setDateDeces((String) payload.get("dateDeces"));

        // ✅ GESTION PHOTO : Décodage Base64
        if (payload.containsKey("photoPere")) {
            String photoBase64 = (String) payload.get("photoPere");
            if (photoBase64 != null && !photoBase64.isEmpty()) {
                pere.setPhotoPere(java.util.Base64.getDecoder().decode(photoBase64));
            }
        }

        // Logique décès (inchangée)
        if (pere.getEstDecedee() != null && pere.getEstDecedee()) {
            pere.setPhone(null);
            pere.setCin(null);
            pere.setDateNaissance(null);
            pere.setVilleNaissance(null);
            pere.setEstMalade(false);
            pere.setTypeMaladie(null);
            pere.setEstTravaille(false);
            pere.setTypeTravail(null);
        }

        familleService.saveFamille(famille);
        return pere;
    }
}
