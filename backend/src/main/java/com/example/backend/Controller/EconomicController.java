package com.example.backend.Controller;

import com.example.backend.Repository.EconomicCategoryRepository;
import com.example.backend.Repository.EconomicReceiptRepository;
import com.example.backend.model.EconomicCategory;
import com.example.backend.model.EconomicReceipt;
import jakarta.annotation.PostConstruct;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/economie")
@CrossOrigin("*")
public class EconomicController {

    private static final String CODE_DEGRE_DEFINI =
            "DEGRE_DEFINI";

    private static final String CODE_DEGRE_NON_DEFINI =
            "DEGRE_NON_DEFINI";

    private static final String CODE_SAAWED_AL_KHAYR =
            "SAAWED_AL_KHAYR";

    private static final Pattern SCHOOL_YEAR_PATTERN =
            Pattern.compile("^(\\d{4})/(\\d{4})$");


    private final EconomicCategoryRepository categoryRepository;

    private final EconomicReceiptRepository receiptRepository;


    public EconomicController(
            EconomicCategoryRepository categoryRepository,
            EconomicReceiptRepository receiptRepository
    ) {

        this.categoryRepository =
                categoryRepository;

        this.receiptRepository =
                receiptRepository;
    }


    // ============================================================
    // INITIALISATION AUTOMATIQUE
    //
    // AUCUNE INSERTION SQL MANUELLE N'EST NECESSAIRE.
    // ============================================================

    @PostConstruct
    @Transactional
    public void initializeSystemCategories() {

        ensureSystemCategory(
                CODE_DEGRE_DEFINI,
                "الدرجات المحددة",
                1
        );

        ensureSystemCategory(
                CODE_DEGRE_NON_DEFINI,
                "معوز / درجة غير محددة",
                2
        );

        ensureSystemCategory(
                CODE_SAAWED_AL_KHAYR,
                "سواعد الخير",
                3
        );
    }


    private void ensureSystemCategory(
            String code,
            String nom,
            int ordre
    ) {

        EconomicCategory category =
                categoryRepository
                        .findByCode(code)
                        .orElseGet(
                                EconomicCategory::new
                        );

        category.setCode(code);
        category.setNom(nom);
        category.setSysteme(true);
        category.setActive(true);
        category.setOrdre(ordre);

        categoryRepository.save(
                category
        );
    }


    // ============================================================
    // CATEGORIES
    // ============================================================

    @GetMapping("/categories")
    public ResponseEntity<List<EconomicCategory>>
    getCategories(
            @RequestParam(
                    defaultValue = "false"
            )
            boolean includeInactive
    ) {

        List<EconomicCategory> result =
                includeInactive

                        ? categoryRepository
                        .findAllByOrderByOrdreAscNomAsc()

                        : categoryRepository
                        .findByActiveTrueOrderByOrdreAscNomAsc();


        return ResponseEntity.ok(
                result
        );
    }


    @PostMapping("/categories")
    public ResponseEntity<?>
    createCategory(
            @RequestBody CategoryRequest request
    ) {

        try {

            String nom =
                    requireText(
                            request.getNom(),
                            "Le nom de la catégorie est obligatoire"
                    );


            if (
                    categoryRepository
                            .findByNomIgnoreCase(nom)
                            .isPresent()
            ) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of(
                                        "message",
                                        "Une catégorie portant ce nom existe déjà"
                                )
                        );
            }


            EconomicCategory category =
                    new EconomicCategory();

            category.setCode(
                    generateSpecialCode()
            );

            category.setNom(
                    nom
            );

            category.setSysteme(
                    false
            );

            category.setActive(
                    request.getActive() == null
                            || request.getActive()
            );

            category.setOrdre(
                    request.getOrdre() != null
                            ? request.getOrdre()
                            : 100
            );


            EconomicCategory saved =
                    categoryRepository.save(
                            category
                    );


            return ResponseEntity.ok(
                    saved
            );

        } catch (RuntimeException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    ex.getMessage()
                            )
                    );
        }
    }


    @PutMapping("/categories/{id}")
    public ResponseEntity<?>
    updateCategory(
            @PathVariable Long id,
            @RequestBody CategoryRequest request
    ) {

        try {

            EconomicCategory category =
                    categoryRepository
                            .findById(id)
                            .orElseThrow(
                                    () ->
                                            new RuntimeException(
                                                    "Catégorie introuvable"
                                            )
                            );


            String nom =
                    requireText(
                            request.getNom(),
                            "Le nom de la catégorie est obligatoire"
                    );


            Optional<EconomicCategory> sameName =
                    categoryRepository
                            .findByNomIgnoreCase(nom);


            if (
                    sameName.isPresent()
                            && !sameName
                            .get()
                            .getId()
                            .equals(id)
            ) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of(
                                        "message",
                                        "Une catégorie portant ce nom existe déjà"
                                )
                        );
            }


            category.setNom(
                    nom
            );


            if (
                    request.getOrdre() != null
            ) {

                category.setOrdre(
                        request.getOrdre()
                );
            }


            // Les trois catégories système restent toujours actives.
            if (
                    !Boolean.TRUE.equals(
                            category.getSysteme()
                    )
            ) {

                if (
                        request.getActive()
                                != null
                ) {

                    category.setActive(
                            request.getActive()
                    );
                }
            } else {

                category.setActive(
                        true
                );
            }


            return ResponseEntity.ok(
                    categoryRepository.save(
                            category
                    )
            );

        } catch (RuntimeException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    ex.getMessage()
                            )
                    );
        }
    }


    @DeleteMapping("/categories/{id}")
    public ResponseEntity<?>
    disableCategory(
            @PathVariable Long id
    ) {

        try {

            EconomicCategory category =
                    categoryRepository
                            .findById(id)
                            .orElseThrow(
                                    () ->
                                            new RuntimeException(
                                                    "Catégorie introuvable"
                                            )
                            );


            if (
                    Boolean.TRUE.equals(
                            category.getSysteme()
                    )
            ) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of(
                                        "message",
                                        "Une catégorie système ne peut pas être supprimée"
                                )
                        );
            }


            // On ne supprime pas physiquement une catégorie ayant un historique.
            // On la désactive afin de préserver toutes les anciennes recettes.
            category.setActive(
                    false
            );

            categoryRepository.save(
                    category
            );


            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Catégorie désactivée"
                    )
            );

        } catch (RuntimeException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    ex.getMessage()
                            )
                    );
        }
    }


    // ============================================================
    // RECETTES
    // ============================================================

    @GetMapping("/recettes")
    public ResponseEntity<List<ReceiptResponse>>
    getReceipts(
            @RequestParam(required = false)
            String anneeScolaire
    ) {

        List<EconomicReceipt> receipts;


        if (
                anneeScolaire == null
                        || anneeScolaire.isBlank()
                        || "all".equalsIgnoreCase(
                        anneeScolaire
                )
        ) {

            receipts =
                    receiptRepository
                            .findAllByOrderByDateReceptionDescIdDesc();

        } else {

            String normalizedYear =
                    normalizeSchoolYear(
                            anneeScolaire
                    );

            receipts =
                    receiptRepository
                            .findByAnneeScolaireOrderByDateReceptionDescIdDesc(
                                    normalizedYear
                            );
        }


        List<ReceiptResponse> result =
                receipts
                        .stream()
                        .map(
                                ReceiptResponse::new
                        )
                        .toList();


        return ResponseEntity.ok(
                result
        );
    }


    @PostMapping("/recettes")
    public ResponseEntity<?>
    createReceipt(
            @RequestBody ReceiptRequest request
    ) {

        try {

            EconomicReceipt receipt =
                    new EconomicReceipt();


            applyReceiptRequest(
                    receipt,
                    request
            );


            EconomicReceipt saved =
                    receiptRepository.save(
                            receipt
                    );


            return ResponseEntity.ok(
                    new ReceiptResponse(
                            saved
                    )
            );

        } catch (RuntimeException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    ex.getMessage()
                            )
                    );
        }
    }


    @PutMapping("/recettes/{id}")
    public ResponseEntity<?>
    updateReceipt(
            @PathVariable Long id,
            @RequestBody ReceiptRequest request
    ) {

        try {

            EconomicReceipt receipt =
                    receiptRepository
                            .findById(id)
                            .orElseThrow(
                                    () ->
                                            new RuntimeException(
                                                    "Recette introuvable"
                                            )
                            );


            applyReceiptRequest(
                    receipt,
                    request
            );


            EconomicReceipt saved =
                    receiptRepository.save(
                            receipt
                    );


            return ResponseEntity.ok(
                    new ReceiptResponse(
                            saved
                    )
            );

        } catch (RuntimeException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    ex.getMessage()
                            )
                    );
        }
    }


    @DeleteMapping("/recettes/{id}")
    public ResponseEntity<?>
    deleteReceipt(
            @PathVariable Long id
    ) {

        if (
                !receiptRepository
                        .existsById(id)
        ) {

            return ResponseEntity
                    .notFound()
                    .build();
        }


        receiptRepository.deleteById(
                id
        );


        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Recette supprimée"
                )
        );
    }


    // ============================================================
    // RESUME PAR ANNEE SCOLAIRE
    // ============================================================

    @GetMapping("/resume")
    public ResponseEntity<?>
    getSummary(
            @RequestParam
            String anneeScolaire
    ) {

        try {

            String normalizedYear =
                    normalizeSchoolYear(
                            anneeScolaire
                    );


            List<EconomicReceipt> receipts =
                    receiptRepository
                            .findByAnneeScolaireOrderByDateReceptionDescIdDesc(
                                    normalizedYear
                            );


            BigDecimal degreDefini =
                    BigDecimal.ZERO;

            BigDecimal degreNonDefini =
                    BigDecimal.ZERO;

            BigDecimal sawaedAlKhayr =
                    BigDecimal.ZERO;

            BigDecimal casSpeciaux =
                    BigDecimal.ZERO;

            BigDecimal totalRecettes =
                    BigDecimal.ZERO;


            Map<Long, BigDecimal> specialTotals =
                    new HashMap<>();


            for (
                    EconomicReceipt receipt :
                    receipts
            ) {

                BigDecimal montant =
                        safeAmount(
                                receipt.getMontant()
                        );


                totalRecettes =
                        totalRecettes.add(
                                montant
                        );


                EconomicCategory category =
                        receipt.getCategorie();


                if (
                        category == null
                ) {

                    continue;
                }


                String code =
                        category.getCode();


                if (
                        CODE_DEGRE_DEFINI.equals(
                                code
                        )
                ) {

                    degreDefini =
                            degreDefini.add(
                                    montant
                            );

                } else if (
                        CODE_DEGRE_NON_DEFINI.equals(
                                code
                        )
                ) {

                    degreNonDefini =
                            degreNonDefini.add(
                                    montant
                            );

                } else if (
                        CODE_SAAWED_AL_KHAYR.equals(
                                code
                        )
                ) {

                    sawaedAlKhayr =
                            sawaedAlKhayr.add(
                                    montant
                            );

                } else {

                    casSpeciaux =
                            casSpeciaux.add(
                                    montant
                            );

                    specialTotals.merge(
                            category.getId(),
                            montant,
                            BigDecimal::add
                    );
                }
            }


            List<Map<String, Object>> categoriesSpeciales =
                    new ArrayList<>();


            for (
                    EconomicCategory category :
                    categoryRepository
                            .findAllByOrderByOrdreAscNomAsc()
            ) {

                if (
                        Boolean.TRUE.equals(
                                category.getSysteme()
                        )
                ) {

                    continue;
                }


                Map<String, Object> row =
                        new LinkedHashMap<>();

                row.put(
                        "categorieId",
                        category.getId()
                );

                row.put(
                        "code",
                        category.getCode()
                );

                row.put(
                        "nom",
                        category.getNom()
                );

                row.put(
                        "active",
                        category.getActive()
                );

                row.put(
                        "montant",
                        specialTotals.getOrDefault(
                                category.getId(),
                                BigDecimal.ZERO
                        )
                );


                categoriesSpeciales.add(
                        row
                );
            }


            Map<String, Object> result =
                    new LinkedHashMap<>();

            result.put(
                    "anneeScolaire",
                    normalizedYear
            );

            result.put(
                    "degreDefini",
                    degreDefini
            );

            result.put(
                    "degreNonDefini",
                    degreNonDefini
            );

            result.put(
                    "sawaedAlKhayr",
                    sawaedAlKhayr
            );

            result.put(
                    "casSpeciaux",
                    casSpeciaux
            );

            result.put(
                    "totalRecettes",
                    totalRecettes
            );

            result.put(
                    "nombreOperations",
                    receipts.size()
            );

            result.put(
                    "categoriesSpeciales",
                    categoriesSpeciales
            );


            return ResponseEntity.ok(
                    result
            );

        } catch (RuntimeException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    ex.getMessage()
                            )
                    );
        }
    }


    // ============================================================
    // HELPERS
    // ============================================================

    private void applyReceiptRequest(
            EconomicReceipt receipt,
            ReceiptRequest request
    ) {

        if (
                request == null
        ) {

            throw new RuntimeException(
                    "Données de recette manquantes"
            );
        }


        String schoolYear =
                normalizeSchoolYear(
                        request.getAnneeScolaire()
                );


        if (
                request.getCategorieId()
                        == null
        ) {

            throw new RuntimeException(
                    "La catégorie est obligatoire"
            );
        }


        EconomicCategory category =
                categoryRepository
                        .findById(
                                request.getCategorieId()
                        )
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Catégorie introuvable"
                                        )
                        );


        if (
                !Boolean.TRUE.equals(
                        category.getActive()
                )
        ) {

            throw new RuntimeException(
                    "Cette catégorie est désactivée"
            );
        }


        BigDecimal montant =
                request.getMontant();


        if (
                montant == null
                        || montant.compareTo(
                        BigDecimal.ZERO
                ) <= 0
        ) {

            throw new RuntimeException(
                    "Le montant doit être supérieur à 0"
            );
        }


        LocalDate dateReception =
                request.getDateReception();


        if (
                dateReception == null
        ) {

            throw new RuntimeException(
                    "La date de réception est obligatoire"
            );
        }


        receipt.setAnneeScolaire(
                schoolYear
        );

        receipt.setCategorie(
                category
        );

        receipt.setMontant(
                montant
        );

        receipt.setDateReception(
                dateReception
        );

        receipt.setSource(
                cleanText(
                        request.getSource()
                )
        );

        receipt.setReferencePaiement(
                cleanText(
                        request.getReferencePaiement()
                )
        );

        receipt.setModePaiement(
                cleanText(
                        request.getModePaiement()
                )
        );

        receipt.setNote(
                cleanText(
                        request.getNote()
                )
        );
    }


    private String normalizeSchoolYear(
            String value
    ) {

        String year =
                requireText(
                        value,
                        "L'année scolaire est obligatoire"
                )
                        .replace(
                                "-",
                                "/"
                        );


        Matcher matcher =
                SCHOOL_YEAR_PATTERN
                        .matcher(
                                year
                        );


        if (
                !matcher.matches()
        ) {

            throw new RuntimeException(
                    "L'année scolaire doit être au format 2026/2027"
            );
        }


        int first =
                Integer.parseInt(
                        matcher.group(1)
                );

        int second =
                Integer.parseInt(
                        matcher.group(2)
                );


        if (
                second != first + 1
        ) {

            throw new RuntimeException(
                    "L'année scolaire n'est pas valide"
            );
        }


        return first
                + "/"
                + second;
    }


    private String requireText(
            String value,
            String message
    ) {

        String cleaned =
                cleanText(
                        value
                );


        if (
                cleaned == null
                        || cleaned.isBlank()
        ) {

            throw new RuntimeException(
                    message
            );
        }


        return cleaned;
    }


    private String cleanText(
            String value
    ) {

        if (
                value == null
        ) {

            return null;
        }


        String cleaned =
                value.trim();


        return cleaned.isBlank()
                ? null
                : cleaned;
    }


    private String generateSpecialCode() {

        return "SPECIAL_"
                + UUID
                .randomUUID()
                .toString()
                .replace(
                        "-",
                        ""
                )
                .substring(
                        0,
                        12
                )
                .toUpperCase();
    }


    private BigDecimal safeAmount(
            BigDecimal value
    ) {

        return value != null
                ? value
                : BigDecimal.ZERO;
    }


    // ============================================================
    // DTO : CATEGORIE
    // ============================================================

    public static class CategoryRequest {

        private String nom;

        private Boolean active;

        private Integer ordre;


        public String getNom() {
            return nom;
        }

        public void setNom(
                String nom
        ) {
            this.nom = nom;
        }

        public Boolean getActive() {
            return active;
        }

        public void setActive(
                Boolean active
        ) {
            this.active = active;
        }

        public Integer getOrdre() {
            return ordre;
        }

        public void setOrdre(
                Integer ordre
        ) {
            this.ordre = ordre;
        }
    }


    // ============================================================
    // DTO : RECETTE
    // ============================================================

    public static class ReceiptRequest {

        private String anneeScolaire;

        private Long categorieId;

        private BigDecimal montant;

        private LocalDate dateReception;

        private String source;

        private String referencePaiement;

        private String modePaiement;

        private String note;


        public String getAnneeScolaire() {
            return anneeScolaire;
        }

        public void setAnneeScolaire(
                String anneeScolaire
        ) {
            this.anneeScolaire =
                    anneeScolaire;
        }

        public Long getCategorieId() {
            return categorieId;
        }

        public void setCategorieId(
                Long categorieId
        ) {
            this.categorieId =
                    categorieId;
        }

        public BigDecimal getMontant() {
            return montant;
        }

        public void setMontant(
                BigDecimal montant
        ) {
            this.montant =
                    montant;
        }

        public LocalDate getDateReception() {
            return dateReception;
        }

        public void setDateReception(
                LocalDate dateReception
        ) {
            this.dateReception =
                    dateReception;
        }

        public String getSource() {
            return source;
        }

        public void setSource(
                String source
        ) {
            this.source =
                    source;
        }

        public String getReferencePaiement() {
            return referencePaiement;
        }

        public void setReferencePaiement(
                String referencePaiement
        ) {
            this.referencePaiement =
                    referencePaiement;
        }

        public String getModePaiement() {
            return modePaiement;
        }

        public void setModePaiement(
                String modePaiement
        ) {
            this.modePaiement =
                    modePaiement;
        }

        public String getNote() {
            return note;
        }

        public void setNote(
                String note
        ) {
            this.note =
                    note;
        }
    }


    // ============================================================
    // DTO : REPONSE RECETTE
    // ============================================================

    public static class ReceiptResponse {

        private final Long id;

        private final String anneeScolaire;

        private final Long categorieId;

        private final String categorieCode;

        private final String categorieNom;

        private final Boolean categorieSysteme;

        private final BigDecimal montant;

        private final LocalDate dateReception;

        private final String source;

        private final String referencePaiement;

        private final String modePaiement;

        private final String note;

        private final LocalDateTime createdAt;


        public ReceiptResponse(
                EconomicReceipt receipt
        ) {

            this.id =
                    receipt.getId();

            this.anneeScolaire =
                    receipt.getAnneeScolaire();

            EconomicCategory category =
                    receipt.getCategorie();

            this.categorieId =
                    category != null
                            ? category.getId()
                            : null;

            this.categorieCode =
                    category != null
                            ? category.getCode()
                            : null;

            this.categorieNom =
                    category != null
                            ? category.getNom()
                            : "";

            this.categorieSysteme =
                    category != null
                            && Boolean.TRUE.equals(
                            category.getSysteme()
                    );

            this.montant =
                    receipt.getMontant();

            this.dateReception =
                    receipt.getDateReception();

            this.source =
                    receipt.getSource();

            this.referencePaiement =
                    receipt.getReferencePaiement();

            this.modePaiement =
                    receipt.getModePaiement();

            this.note =
                    receipt.getNote();

            this.createdAt =
                    receipt.getCreatedAt();
        }


        public Long getId() {
            return id;
        }

        public String getAnneeScolaire() {
            return anneeScolaire;
        }

        public Long getCategorieId() {
            return categorieId;
        }

        public String getCategorieCode() {
            return categorieCode;
        }

        public String getCategorieNom() {
            return categorieNom;
        }

        public Boolean getCategorieSysteme() {
            return categorieSysteme;
        }

        public BigDecimal getMontant() {
            return montant;
        }

        public LocalDate getDateReception() {
            return dateReception;
        }

        public String getSource() {
            return source;
        }

        public String getReferencePaiement() {
            return referencePaiement;
        }

        public String getModePaiement() {
            return modePaiement;
        }

        public String getNote() {
            return note;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }
    }
}
