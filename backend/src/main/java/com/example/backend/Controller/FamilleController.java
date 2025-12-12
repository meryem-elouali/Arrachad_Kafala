package com.example.backend.Controller;

import com.example.backend.Repository.*;
import com.example.backend.model.*;
import com.example.backend.service.FamilleService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

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
            @RequestParam String possedeMalade,
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

            // 🔹 Désérialiser les enfants depuis le JSON
            List<Enfant> enfants = objectMapper.readValue(enfantsJson, new TypeReference<List<Enfant>>() {});

            // 🔹 Créer la famille
            Famille famille = new Famille();
            famille.setAdresseFamille(adresseFamille);
            famille.setPhone(phone);
            famille.setDateInscription(dateInscription);
            famille.setPossedeMalade(Boolean.parseBoolean(possedeMalade));
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

            // 🔹 Désérialiser les études depuis le JSON
            List<Etude> etudes = objectMapper.readValue(etudesJson, new TypeReference<List<Etude>>() {});

            // 🔹 Associer chaque étude à son enfant et sauvegarder
            for (Etude etude : etudes) {
                Enfant enfant = savedFamille.getEnfants().stream()
                        .filter(e -> e.getId().equals(etude.getEnfant().getId()))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Enfant non trouvé"));

                etude.setEnfant(enfant);

                Ecole ecole = ecoleRepo.findById(etude.getEcole().getId())
                        .orElseThrow(() -> new RuntimeException("École non trouvée"));
                etude.setEcole(ecole);

                NiveauScolaire niveau = niveauScolaireRepo.findById(etude.getNiveauScolaire().getId())
                        .orElseThrow(() -> new RuntimeException("Niveau scolaire non trouvé"));
                etude.setNiveauScolaire(niveau);

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
    public Mere updateMere(@PathVariable Long id, @RequestBody Mere updatedMere) {
        System.out.println("Données reçues pour mise à jour : " + updatedMere);

        Famille famille = familleService.getFamilleById(id);
        if (famille == null) {
            throw new RuntimeException("Famille introuvable avec l'id : " + id);
        }

        Mere mere = famille.getMere();
        if (mere == null) {
            mere = new Mere();
            famille.setMere(mere);
        }

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

        familleService.saveFamille(famille);
        return mere;
    }

    @PutMapping("/{id}/pere")
    public Pere updatePere(@PathVariable Long id, @RequestBody Pere updatedPere) {
        System.out.println("Données reçues pour mise à jour : " + updatedPere);

        Famille famille = familleService.getFamilleById(id);
        if (famille == null) {
            throw new RuntimeException("Famille introuvable avec l'id : " + id);
        }

        Pere pere = famille.getPere();
        if (pere == null) {
            pere = new Pere();
            famille.setPere(pere);
        }

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

        familleService.saveFamille(famille);
        return pere;
    }
}
