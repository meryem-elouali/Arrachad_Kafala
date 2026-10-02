package com.example.backend.Controller;

import com.example.backend.Repository.EconomicCategoryRepository;
import com.example.backend.Repository.EconomicReceiptRepository;
import com.example.backend.Repository.FamilleRepository;
import com.example.backend.Repository.FamilyAidRepository;
import com.example.backend.model.EconomicCategory;
import com.example.backend.model.EconomicReceipt;
import com.example.backend.model.Famille;
import com.example.backend.model.FamilyAid;
import com.example.backend.service.EconomicService;
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
@CrossOrigin(
        origins = "http://localhost:3000",
        allowCredentials = "true"
)
public class EconomicController {

    public static final String FUND_AYTAM = "DEGRE_DEFINI";
    public static final String FUND_MOUAWIZ = "DEGRE_NON_DEFINI";
    public static final String FUND_SAAWED = "SAAWED_AL_KHAYR";
    public static final String FUND_SARATAN = "SARATAN";

    private static final Pattern SCHOOL_YEAR_PATTERN =
            Pattern.compile("^(\\d{4})/(\\d{4})$");

    private final EconomicCategoryRepository categoryRepository;
    private final EconomicReceiptRepository receiptRepository;
    private final EconomicService economicService;
    private final FamilyAidRepository familyAidRepository;
    private final FamilleRepository familleRepository;

    public EconomicController(
            EconomicCategoryRepository categoryRepository,
            EconomicReceiptRepository receiptRepository,
            EconomicService economicService,
            FamilyAidRepository familyAidRepository,
            FamilleRepository familleRepository
    ) {
        this.categoryRepository = categoryRepository;
        this.receiptRepository = receiptRepository;
        this.economicService = economicService;
        this.familyAidRepository = familyAidRepository;
        this.familleRepository = familleRepository;
    }

    @PostConstruct
    @Transactional
    public void initializeSystemFunds() {
        ensureSystemFund(FUND_AYTAM, "صندوق الأيتام", 1);
        ensureSystemFund(FUND_MOUAWIZ, "صندوق المعوز", 2);
        ensureSystemFund(FUND_SAAWED, "صندوق سواعد الخير", 3);
        ensureSystemFund(FUND_SARATAN, "صندوق السرطان", 4);
    }

    private void ensureSystemFund(String code, String nom, int ordre) {
        EconomicCategory fund =
                categoryRepository
                        .findByCode(code)
                        .orElseGet(EconomicCategory::new);

        fund.setCode(code);
        fund.setNom(nom);
        fund.setSysteme(true);
        fund.setActive(true);
        fund.setOrdre(ordre);

        categoryRepository.save(fund);
    }

    // ============================================================
    // FONDS
    // ============================================================

    @GetMapping({"/fonds", "/categories"})
    public ResponseEntity<List<EconomicCategory>> getFunds(
            @RequestParam(defaultValue = "false")
            boolean includeInactive
    ) {
        List<EconomicCategory> result =
                includeInactive
                        ? categoryRepository.findAllByOrderByOrdreAscNomAsc()
                        : categoryRepository.findByActiveTrueOrderByOrdreAscNomAsc();

        return ResponseEntity.ok(result);
    }

    @PostMapping({"/fonds", "/categories"})
    public ResponseEntity<?> createFund(
            @RequestBody FundRequest request
    ) {
        try {
            String nom =
                    requireText(
                            request.getNom(),
                            "اسم الصندوق إجباري"
                    );

            if (categoryRepository.findByNomIgnoreCase(nom).isPresent()) {
                return badRequest("يوجد صندوق بنفس الاسم");
            }

            EconomicCategory fund = new EconomicCategory();

            fund.setCode(generateCustomFundCode());
            fund.setNom(nom);
            fund.setSysteme(false);
            fund.setActive(
                    request.getActive() == null
                            || request.getActive()
            );
            fund.setOrdre(
                    request.getOrdre() != null
                            ? request.getOrdre()
                            : 100
            );

            return ResponseEntity.ok(
                    categoryRepository.save(fund)
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @PutMapping({"/fonds/{id}", "/categories/{id}"})
    public ResponseEntity<?> updateFund(
            @PathVariable Long id,
            @RequestBody FundRequest request
    ) {
        try {
            EconomicCategory fund =
                    categoryRepository
                            .findById(id)
                            .orElseThrow(
                                    () -> new RuntimeException(
                                            "الصندوق غير موجود"
                                    )
                            );

            String nom =
                    requireText(
                            request.getNom(),
                            "اسم الصندوق إجباري"
                    );

            Optional<EconomicCategory> sameName =
                    categoryRepository.findByNomIgnoreCase(nom);

            if (
                    sameName.isPresent()
                            && !sameName.get().getId().equals(id)
            ) {
                return badRequest("يوجد صندوق بنفس الاسم");
            }

            fund.setNom(nom);

            if (request.getOrdre() != null) {
                fund.setOrdre(request.getOrdre());
            }

            if (Boolean.TRUE.equals(fund.getSysteme())) {
                fund.setActive(true);
            } else if (request.getActive() != null) {
                fund.setActive(request.getActive());
            }

            return ResponseEntity.ok(
                    categoryRepository.save(fund)
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @DeleteMapping({"/fonds/{id}", "/categories/{id}"})
    public ResponseEntity<?> disableFund(
            @PathVariable Long id
    ) {
        try {
            EconomicCategory fund =
                    categoryRepository
                            .findById(id)
                            .orElseThrow(
                                    () -> new RuntimeException(
                                            "الصندوق غير موجود"
                                    )
                            );

            if (Boolean.TRUE.equals(fund.getSysteme())) {
                return badRequest("لا يمكن تعطيل صندوق أساسي");
            }

            fund.setActive(false);
            categoryRepository.save(fund);

            return ResponseEntity.ok(
                    Map.of("message", "تم تعطيل الصندوق")
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    // ============================================================
    // ENTREES
    // ============================================================

    @GetMapping({"/entrees", "/recettes"})
    public ResponseEntity<List<IncomeResponse>> getIncomes(
            @RequestParam(required = false)
            String anneeScolaire,
            @RequestParam(required = false)
            Long fundId
    ) {
        List<EconomicReceipt> receipts;

        if (
                anneeScolaire == null
                        || anneeScolaire.isBlank()
                        || "all".equalsIgnoreCase(anneeScolaire)
        ) {
            receipts =
                    receiptRepository
                            .findAllByOrderByDateReceptionDescIdDesc();
        } else {
            String normalized =
                    normalizeSchoolYear(anneeScolaire);

            receipts =
                    receiptRepository
                            .findByAnneeScolaireOrderByDateReceptionDescIdDesc(
                                    normalized
                            );
        }

        List<IncomeResponse> result =
                receipts.stream()
                        .filter(
                                receipt ->
                                        fundId == null
                                                || (
                                                receipt.getCategorie() != null
                                                        && Objects.equals(
                                                        receipt.getCategorie().getId(),
                                                        fundId
                                                )
                                        )
                        )
                        .map(IncomeResponse::new)
                        .toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping({"/entrees", "/recettes"})
    public ResponseEntity<?> createIncome(
            @RequestBody IncomeRequest request
    ) {
        try {
            EconomicReceipt receipt = new EconomicReceipt();

            applyIncomeRequest(receipt, request);

            EconomicReceipt saved =
                    receiptRepository.save(receipt);

            return ResponseEntity.ok(
                    new IncomeResponse(saved)
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @PutMapping({"/entrees/{id}", "/recettes/{id}"})
    public ResponseEntity<?> updateIncome(
            @PathVariable Long id,
            @RequestBody IncomeRequest request
    ) {
        try {
            EconomicReceipt receipt =
                    receiptRepository
                            .findById(id)
                            .orElseThrow(
                                    () -> new RuntimeException(
                                            "المدخول غير موجود"
                                    )
                            );

            applyIncomeRequest(receipt, request);

            EconomicReceipt saved =
                    receiptRepository.save(receipt);

            return ResponseEntity.ok(
                    new IncomeResponse(saved)
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @DeleteMapping({"/entrees/{id}", "/recettes/{id}"})
    public ResponseEntity<?> deleteIncome(
            @PathVariable Long id
    ) {
        if (!receiptRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        receiptRepository.deleteById(id);

        return ResponseEntity.ok(
                Map.of("message", "تم حذف المدخول")
        );
    }

    // ============================================================
    // TABLEAU DE BORD
    // ============================================================

    @GetMapping("/resume")
    public ResponseEntity<?> getSummary(
            @RequestParam
            String anneeScolaire
    ) {
        try {
            String normalized =
                    normalizeSchoolYear(anneeScolaire);

            return ResponseEntity.ok(
                    economicService.getDashboard(normalized)
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @GetMapping("/fonds/{fundId}/details")
    public ResponseEntity<?> getFundDetails(
            @PathVariable Long fundId,
            @RequestParam String anneeScolaire
    ) {
        try {
            String normalized =
                    normalizeSchoolYear(anneeScolaire);

            if (!categoryRepository.existsById(fundId)) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(
                    economicService.getFundDetails(
                            fundId,
                            normalized
                    )
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    // ============================================================
    // DEPENSES FAMILLES (sorties prélevées sur une caisse)
    // ============================================================

    @GetMapping("/familles/{familleId}/depenses")
    public ResponseEntity<List<FamilyExpenseResponse>> getFamilyExpenses(
            @PathVariable Long familleId
    ) {
        return ResponseEntity.ok(
                familyAidRepository
                        .findByFamilleIdOrderByDateDepenseDescIdDesc(familleId)
                        .stream()
                        .map(FamilyExpenseResponse::new)
                        .toList()
        );
    }

    /**
     * Caisse proposée par défaut pour une famille :
     * أيتام -> صندوق الأيتام، معوز -> صندوق المعوز.
     */
    @GetMapping("/familles/{familleId}/caisse-defaut")
    public ResponseEntity<Map<String, Object>> getDefaultFund(
            @PathVariable Long familleId
    ) {
        Famille famille = familleRepository.findById(familleId).orElse(null);
        EconomicCategory caisse = economicService.caisseParDefaut(famille);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fundId", caisse != null ? caisse.getId() : null);
        result.put("fundNom", caisse != null ? caisse.getNom() : null);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/familles/{familleId}/depenses")
    public ResponseEntity<?> createFamilyExpense(
            @PathVariable Long familleId,
            @RequestBody FamilyExpenseRequest request
    ) {
        try {
            Famille famille =
                    familleRepository
                            .findById(familleId)
                            .orElseThrow(() -> new RuntimeException("الأسرة غير موجودة"));

            FamilyAid aide = new FamilyAid();
            aide.setFamille(famille);
            applyFamilyExpenseRequest(aide, request);

            return ResponseEntity.ok(
                    new FamilyExpenseResponse(familyAidRepository.save(aide))
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @PutMapping("/depenses-familles/{id}")
    public ResponseEntity<?> updateFamilyExpense(
            @PathVariable Long id,
            @RequestBody FamilyExpenseRequest request
    ) {
        try {
            FamilyAid aide =
                    familyAidRepository
                            .findById(id)
                            .orElseThrow(() -> new RuntimeException("المصروف غير موجود"));

            applyFamilyExpenseRequest(aide, request);

            return ResponseEntity.ok(
                    new FamilyExpenseResponse(familyAidRepository.save(aide))
            );

        } catch (RuntimeException ex) {
            return badRequest(ex.getMessage());
        }
    }

    @DeleteMapping("/depenses-familles/{id}")
    public ResponseEntity<?> deleteFamilyExpense(
            @PathVariable Long id
    ) {
        if (!familyAidRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        familyAidRepository.deleteById(id);

        return ResponseEntity.ok(
                Map.of("message", "تم حذف المصروف")
        );
    }

    private void applyFamilyExpenseRequest(
            FamilyAid aide,
            FamilyExpenseRequest request
    ) {
        if (request == null) {
            throw new RuntimeException("بيانات المصروف ناقصة");
        }

        if (request.getFundId() == null) {
            throw new RuntimeException("اختر الصندوق");
        }

        EconomicCategory caisse =
                categoryRepository
                        .findById(request.getFundId())
                        .orElseThrow(() -> new RuntimeException("الصندوق غير موجود"));

        if (!Boolean.TRUE.equals(caisse.getActive())) {
            throw new RuntimeException("هذا الصندوق غير مفعل");
        }

        BigDecimal montant = request.getMontant();

        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("يجب أن يكون المبلغ أكبر من صفر");
        }

        if (request.getDateDepense() == null) {
            throw new RuntimeException("تاريخ المصروف إجباري");
        }

        aide.setCaisse(caisse);
        aide.setMontant(montant);
        aide.setDateDepense(request.getDateDepense());
        aide.setAnneeScolaire(
                request.getAnneeScolaire() != null && !request.getAnneeScolaire().isBlank()
                        ? normalizeSchoolYear(request.getAnneeScolaire())
                        : schoolYearOf(request.getDateDepense())
        );
        aide.setLibelle(requireText(request.getLibelle(), "نوع المصروف إجباري"));
        aide.setNote(cleanText(request.getNote()));
    }

    // L'année scolaire commence en septembre
    private String schoolYearOf(LocalDate date) {
        int start = date.getMonthValue() >= 9 ? date.getYear() : date.getYear() - 1;
        return start + "/" + (start + 1);
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private void applyIncomeRequest(
            EconomicReceipt receipt,
            IncomeRequest request
    ) {
        if (request == null) {
            throw new RuntimeException("بيانات المدخول ناقصة");
        }

        String schoolYear =
                normalizeSchoolYear(
                        request.getAnneeScolaire()
                );

        Long fundId =
                request.getFundId() != null
                        ? request.getFundId()
                        : request.getCategorieId();

        if (fundId == null) {
            throw new RuntimeException("اختر الصندوق");
        }

        EconomicCategory fund =
                categoryRepository
                        .findById(fundId)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "الصندوق غير موجود"
                                )
                        );

        if (!Boolean.TRUE.equals(fund.getActive())) {
            throw new RuntimeException("هذا الصندوق غير مفعل");
        }

        BigDecimal montant = request.getMontant();

        if (
                montant == null
                        || montant.compareTo(BigDecimal.ZERO) <= 0
        ) {
            throw new RuntimeException(
                    "يجب أن يكون المبلغ أكبر من صفر"
            );
        }

        if (request.getDateReception() == null) {
            throw new RuntimeException(
                    "تاريخ الاستلام إجباري"
            );
        }

        receipt.setAnneeScolaire(schoolYear);
        receipt.setCategorie(fund);
        receipt.setMontant(montant);
        receipt.setDateReception(request.getDateReception());
        receipt.setSource(cleanText(request.getSource()));
        receipt.setReferencePaiement(
                cleanText(request.getReferencePaiement())
        );
        receipt.setModePaiement(
                cleanText(request.getModePaiement())
        );
        receipt.setNote(cleanText(request.getNote()));
    }

    private String normalizeSchoolYear(String value) {
        String year =
                requireText(
                        value,
                        "السنة الدراسية إجبارية"
                )
                        .replace("-", "/");

        Matcher matcher =
                SCHOOL_YEAR_PATTERN.matcher(year);

        if (!matcher.matches()) {
            throw new RuntimeException(
                    "السنة الدراسية يجب أن تكون مثل 2026/2027"
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

        if (second != first + 1) {
            throw new RuntimeException(
                    "السنة الدراسية غير صحيحة"
            );
        }

        return first + "/" + second;
    }

    private String requireText(
            String value,
            String message
    ) {
        String cleaned =
                cleanText(value);

        if (
                cleaned == null
                        || cleaned.isBlank()
        ) {
            throw new RuntimeException(message);
        }

        return cleaned;
    }

    private String cleanText(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();

        return cleaned.isBlank()
                ? null
                : cleaned;
    }

    private String generateCustomFundCode() {
        return "FUND_"
                + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 12)
                .toUpperCase();
    }

    private ResponseEntity<Map<String, String>> badRequest(
            String message
    ) {
        return ResponseEntity
                .badRequest()
                .body(
                        Map.of(
                                "message",
                                message != null
                                        ? message
                                        : "خطأ غير معروف"
                        )
                );
    }

    // ============================================================
    // DTO FOND
    // ============================================================

    public static class FundRequest {

        private String nom;
        private Boolean active;
        private Integer ordre;

        public String getNom() {
            return nom;
        }

        public void setNom(String nom) {
            this.nom = nom;
        }

        public Boolean getActive() {
            return active;
        }

        public void setActive(Boolean active) {
            this.active = active;
        }

        public Integer getOrdre() {
            return ordre;
        }

        public void setOrdre(Integer ordre) {
            this.ordre = ordre;
        }
    }

    // ============================================================
    // DTO ENTREE
    // ============================================================

    public static class IncomeRequest {

        private String anneeScolaire;
        private Long fundId;

        // Compatibilité ancien frontend
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

        public void setAnneeScolaire(String anneeScolaire) {
            this.anneeScolaire = anneeScolaire;
        }

        public Long getFundId() {
            return fundId;
        }

        public void setFundId(Long fundId) {
            this.fundId = fundId;
        }

        public Long getCategorieId() {
            return categorieId;
        }

        public void setCategorieId(Long categorieId) {
            this.categorieId = categorieId;
        }

        public BigDecimal getMontant() {
            return montant;
        }

        public void setMontant(BigDecimal montant) {
            this.montant = montant;
        }

        public LocalDate getDateReception() {
            return dateReception;
        }

        public void setDateReception(LocalDate dateReception) {
            this.dateReception = dateReception;
        }

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }

        public String getReferencePaiement() {
            return referencePaiement;
        }

        public void setReferencePaiement(String referencePaiement) {
            this.referencePaiement = referencePaiement;
        }

        public String getModePaiement() {
            return modePaiement;
        }

        public void setModePaiement(String modePaiement) {
            this.modePaiement = modePaiement;
        }

        public String getNote() {
            return note;
        }

        public void setNote(String note) {
            this.note = note;
        }
    }

    // ============================================================
    // DTO REPONSE ENTREE
    // ============================================================

    public static class IncomeResponse {

        private final Long id;
        private final String anneeScolaire;

        private final Long fundId;
        private final String fundCode;
        private final String fundNom;
        private final Boolean fundSysteme;

        private final BigDecimal montant;
        private final LocalDate dateReception;
        private final String source;
        private final String referencePaiement;
        private final String modePaiement;
        private final String note;
        private final LocalDateTime createdAt;

        public IncomeResponse(EconomicReceipt receipt) {
            this.id = receipt.getId();
            this.anneeScolaire = receipt.getAnneeScolaire();

            EconomicCategory fund =
                    receipt.getCategorie();

            this.fundId =
                    fund != null
                            ? fund.getId()
                            : null;

            this.fundCode =
                    fund != null
                            ? fund.getCode()
                            : null;

            this.fundNom =
                    fund != null
                            ? fund.getNom()
                            : "";

            this.fundSysteme =
                    fund != null
                            && Boolean.TRUE.equals(
                            fund.getSysteme()
                    );

            this.montant = receipt.getMontant();
            this.dateReception = receipt.getDateReception();
            this.source = receipt.getSource();
            this.referencePaiement =
                    receipt.getReferencePaiement();
            this.modePaiement = receipt.getModePaiement();
            this.note = receipt.getNote();
            this.createdAt = receipt.getCreatedAt();
        }

        public Long getId() {
            return id;
        }

        public String getAnneeScolaire() {
            return anneeScolaire;
        }

        public Long getFundId() {
            return fundId;
        }

        public String getFundCode() {
            return fundCode;
        }

        public String getFundNom() {
            return fundNom;
        }

        public Boolean getFundSysteme() {
            return fundSysteme;
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

    // ============================================================
    // DTO DEPENSE FAMILLE
    // ============================================================

    public static class FamilyExpenseRequest {

        private Long fundId;
        private String anneeScolaire;
        private BigDecimal montant;
        private LocalDate dateDepense;
        private String libelle;
        private String note;

        public Long getFundId() { return fundId; }
        public void setFundId(Long fundId) { this.fundId = fundId; }

        public String getAnneeScolaire() { return anneeScolaire; }
        public void setAnneeScolaire(String anneeScolaire) { this.anneeScolaire = anneeScolaire; }

        public BigDecimal getMontant() { return montant; }
        public void setMontant(BigDecimal montant) { this.montant = montant; }

        public LocalDate getDateDepense() { return dateDepense; }
        public void setDateDepense(LocalDate dateDepense) { this.dateDepense = dateDepense; }

        public String getLibelle() { return libelle; }
        public void setLibelle(String libelle) { this.libelle = libelle; }

        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }

    public static class FamilyExpenseResponse {

        private final Long id;
        private final Long familleId;
        private final Long fundId;
        private final String fundNom;
        private final String anneeScolaire;
        private final BigDecimal montant;
        private final LocalDate dateDepense;
        private final String libelle;
        private final String note;
        private final LocalDateTime createdAt;

        public FamilyExpenseResponse(FamilyAid aide) {
            this.id = aide.getId();
            this.familleId = aide.getFamille() != null ? aide.getFamille().getId() : null;
            this.fundId = aide.getCaisse() != null ? aide.getCaisse().getId() : null;
            this.fundNom = aide.getCaisse() != null ? aide.getCaisse().getNom() : "";
            this.anneeScolaire = aide.getAnneeScolaire();
            this.montant = aide.getMontant();
            this.dateDepense = aide.getDateDepense();
            this.libelle = aide.getLibelle();
            this.note = aide.getNote();
            this.createdAt = aide.getCreatedAt();
        }

        public Long getId() { return id; }
        public Long getFamilleId() { return familleId; }
        public Long getFundId() { return fundId; }
        public String getFundNom() { return fundNom; }
        public String getAnneeScolaire() { return anneeScolaire; }
        public BigDecimal getMontant() { return montant; }
        public LocalDate getDateDepense() { return dateDepense; }
        public String getLibelle() { return libelle; }
        public String getNote() { return note; }
        public LocalDateTime getCreatedAt() { return createdAt; }
    }
}
