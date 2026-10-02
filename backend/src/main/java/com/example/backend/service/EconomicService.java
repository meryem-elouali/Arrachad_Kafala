package com.example.backend.service;

import com.example.backend.Repository.EconomicCategoryRepository;
import com.example.backend.Repository.EconomicReceiptRepository;
import com.example.backend.Repository.FamilyAidRepository;
import com.example.backend.model.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Calcul des caisses (صناديق).
 *
 * Une caisse = EconomicCategory.
 * - Entrées  : EconomicReceipt saisies à la main.
 * - Sorties  : calculées automatiquement à partir de
 *     1) les événements (caisse choisie sur l'événement, sinon répartition automatique),
 *     2) les dépenses des familles (FamilyAid).
 */
@Service
@Transactional(readOnly = true)
public class EconomicService {

    public static final String FUND_AYTAM = "DEGRE_DEFINI";
    public static final String FUND_MOUAWIZ = "DEGRE_NON_DEFINI";
    public static final String FUND_SAAWED = "SAAWED_AL_KHAYR";
    public static final String FUND_SARATAN = "SARATAN";

    private final EconomicCategoryRepository categoryRepository;
    private final EconomicReceiptRepository receiptRepository;
    private final FamilyAidRepository familyAidRepository;
    private final EventService eventService;

    public EconomicService(
            EconomicCategoryRepository categoryRepository,
            EconomicReceiptRepository receiptRepository,
            FamilyAidRepository familyAidRepository,
            EventService eventService
    ) {
        this.categoryRepository = categoryRepository;
        this.receiptRepository = receiptRepository;
        this.familyAidRepository = familyAidRepository;
        this.eventService = eventService;
    }

    // ============================================================
    // DASHBOARD
    // ============================================================

    public Map<String, Object> getDashboard(String anneeScolaire) {
        YearData data = loadYear(anneeScolaire);

        List<Map<String, Object>> fonds = new ArrayList<>();
        BigDecimal totalEntrees = BigDecimal.ZERO;
        BigDecimal totalSorties = BigDecimal.ZERO;

        for (EconomicCategory caisse : categoryRepository.findByActiveTrueOrderByOrdreAscNomAsc()) {
            Map<String, Object> summary = buildSummary(caisse, data);
            fonds.add(summary);
            totalEntrees = totalEntrees.add((BigDecimal) summary.get("entrees"));
            totalSorties = totalSorties.add((BigDecimal) summary.get("totalSorties"));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("anneeScolaire", anneeScolaire);
        result.put("totalEntrees", totalEntrees);
        result.put("totalSorties", totalSorties);
        result.put("solde", totalEntrees.subtract(totalSorties));
        // Montants d'événements sans caisse et impossibles à répartir automatiquement
        result.put("nonVentile", data.nonVentile);
        result.put("fonds", fonds);
        return result;
    }

    // ============================================================
    // DETAILS D'UNE CAISSE
    // ============================================================

    public Map<String, Object> getFundDetails(Long caisseId, String anneeScolaire) {
        EconomicCategory caisse = categoryRepository.findById(caisseId)
                .orElseThrow(() -> new RuntimeException("الصندوق غير موجود"));

        YearData data = loadYear(anneeScolaire);
        Map<String, Object> result = new LinkedHashMap<>(buildSummary(caisse, data));
        result.put("anneeScolaire", anneeScolaire);

        List<Map<String, Object>> operations = new ArrayList<>();

        for (EconomicReceipt r : data.receipts) {
            if (!sameCaisse(r.getCategorie(), caisseId)) continue;

            operations.add(operation(
                    r.getId(), "ENTREE", "ENTREE", r.getDateReception(),
                    r.getNote() != null && !r.getNote().isBlank() ? r.getNote() : "مدخول مالي",
                    r.getSource(), null, r.getReferencePaiement(), safe(r.getMontant())
            ));
        }

        for (Map.Entry<Event, Map<Long, BigDecimal>> entry : data.eventAllocations.entrySet()) {
            BigDecimal montant = entry.getValue().getOrDefault(caisseId, BigDecimal.ZERO);
            if (montant.signum() <= 0) continue;

            Event event = entry.getKey();
            operations.add(operation(
                    event.getId(), "SORTIE", "EVENT", event.getStartDate(),
                    event.getTitle(),
                    event.getCaisse() != null ? "نشاط (صندوق محدد)" : "نشاط (توزيع تلقائي)",
                    null, "EVENT-" + event.getId(), montant
            ));
        }

        for (FamilyAid aide : data.familyAids) {
            if (!sameCaisse(aide.getCaisse(), caisseId)) continue;

            operations.add(operation(
                    aide.getId(), "SORTIE", "FAMILLE", aide.getDateDepense(),
                    aide.getLibelle() != null ? aide.getLibelle() : "مصروف عائلة",
                    "مصاريف الأسر", familleLabel(aide.getFamille()),
                    aide.getFamille() != null ? "FAMILLE-" + aide.getFamille().getId() : null,
                    safe(aide.getMontant())
            ));
        }

        // Du plus récent au plus ancien
        operations.sort((a, b) -> String.valueOf(b.get("date")).compareTo(String.valueOf(a.get("date"))));

        result.put("operations", operations);
        return result;
    }

    // ============================================================
    // CHARGEMENT D'UNE ANNEE (une seule passe sur les données)
    // ============================================================

    private static class YearData {
        List<EconomicReceipt> receipts;
        List<FamilyAid> familyAids;
        // Événement -> (caisseId -> montant)
        Map<Event, Map<Long, BigDecimal>> eventAllocations = new LinkedHashMap<>();
        BigDecimal nonVentile = BigDecimal.ZERO;
    }

    private YearData loadYear(String anneeScolaire) {
        YearData data = new YearData();
        data.receipts = receiptRepository.findByAnneeScolaireOrderByDateReceptionDescIdDesc(anneeScolaire);
        data.familyAids = familyAidRepository.findByAnneeScolaire(anneeScolaire);

        Map<String, Long> caisseParCode = new HashMap<>();
        for (EconomicCategory c : categoryRepository.findAll()) {
            if (c.getCode() != null) caisseParCode.put(c.getCode(), c.getId());
        }

        FamilleIndex index = null;

        for (Event event : eventService.getAllEvents()) {
            if (event == null || !Objects.equals(anneeScolaire, event.getAnneeScolaire())) continue;

            Map<Long, BigDecimal> allocation = new HashMap<>();

            if (event.getCaisse() != null) {
                // Caisse choisie explicitement : tout le coût de l'événement y va.
                allocation.put(event.getCaisse().getId(), safe(event.getMontantTotal()));
            } else {
                if (index == null) index = new FamilleIndex(eventService.getAllFamilles());

                MontantsCategories m = calculerMontantsCategories(event, index);
                add(allocation, caisseParCode.get(FUND_AYTAM), m.degresDefinis());
                add(allocation, caisseParCode.get(FUND_MOUAWIZ), m.mouawiz());
                add(allocation, caisseParCode.get(FUND_SAAWED), m.sawaedAlKhayr());
                data.nonVentile = data.nonVentile.add(m.nonVentile());
            }

            data.eventAllocations.put(event, allocation);
        }

        return data;
    }

    private Map<String, Object> buildSummary(EconomicCategory caisse, YearData data) {
        Long id = caisse.getId();

        BigDecimal entrees = data.receipts.stream()
                .filter(r -> sameCaisse(r.getCategorie(), id))
                .map(r -> safe(r.getMontant()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal sortiesEvents = data.eventAllocations.values().stream()
                .map(a -> a.getOrDefault(id, BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal sortiesFamilles = data.familyAids.stream()
                .filter(a -> sameCaisse(a.getCaisse(), id))
                .map(a -> safe(a.getMontant()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Le soutien scolaire n'est pas encore rattaché à une caisse.
        BigDecimal sortiesSoutien = BigDecimal.ZERO;

        BigDecimal totalSorties = sortiesEvents.add(sortiesFamilles).add(sortiesSoutien);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("fundId", id);
        result.put("code", caisse.getCode());
        result.put("nom", caisse.getNom());
        result.put("systeme", caisse.getSysteme());
        result.put("active", caisse.getActive());
        result.put("entrees", entrees);
        result.put("sortiesEvents", sortiesEvents);
        result.put("sortiesSoutien", sortiesSoutien);
        result.put("sortiesFamilles", sortiesFamilles);
        result.put("totalSorties", totalSorties);
        result.put("solde", entrees.subtract(totalSorties));
        return result;
    }

    // ============================================================
    // EVENT : REPARTITION AUTOMATIQUE (quand aucune caisse n'est choisie)
    //
    // 1) سواعد الخير coché -> tout dans صندوق سواعد الخير
    // 2) Sinon : famille avec degré -> صندوق الأيتام, sans degré -> صندوق المعوز
    // 3) Ce qui ne peut pas être réparti honnêtement -> nonVentile
    // ============================================================

    private record MontantsCategories(
            BigDecimal degresDefinis,
            BigDecimal mouawiz,
            BigDecimal sawaedAlKhayr,
            BigDecimal nonVentile
    ) {
    }

    private static class FamilleIndex {
        final Map<Long, Famille> parMere = new HashMap<>();
        final Map<Long, Famille> parEnfant = new HashMap<>();

        FamilleIndex(List<Famille> familles) {
            for (Famille famille : familles) {
                if (famille.getMere() != null && famille.getMere().getId() != null) {
                    parMere.put(famille.getMere().getId(), famille);
                }
                if (famille.getEnfants() != null) {
                    for (Enfant enfant : famille.getEnfants()) {
                        if (enfant != null && enfant.getId() != null) {
                            parEnfant.put(enfant.getId(), famille);
                        }
                    }
                }
            }
        }

        Famille resolve(EventParticipant p) {
            if (p == null) return null;
            if (p.getParticipantType() == ParticipantType.FAMILLE) return p.getFamille();
            if (p.getParticipantType() == ParticipantType.MERE && p.getMere() != null) {
                return parMere.get(p.getMere().getId());
            }
            if (p.getParticipantType() == ParticipantType.ENFANT && p.getEnfant() != null) {
                return parEnfant.get(p.getEnfant().getId());
            }
            return null;
        }
    }

    private MontantsCategories calculerMontantsCategories(Event event, FamilleIndex index) {
        BigDecimal zero = BigDecimal.ZERO;
        List<EventParticipant> participants =
                event.getParticipants() != null ? event.getParticipants() : List.of();

        if (Boolean.TRUE.equals(event.getSawaedAlKhayr())) {
            return new MontantsCategories(zero, zero, safe(event.getMontantTotal()), zero);
        }

        if ("GLOBAL".equals(event.getTypeMontant())) {
            boolean hasDefined = false;
            boolean hasMouawiz = false;

            for (EventParticipant participant : participants) {
                Famille famille = index.resolve(participant);
                if (famille != null && famille.getDegreFamille() != null) {
                    hasDefined = true;
                } else {
                    hasMouawiz = true;
                }
            }

            BigDecimal total = safe(event.getMontantTotal());

            if (hasDefined && !hasMouawiz) return new MontantsCategories(total, zero, zero, zero);
            if (hasMouawiz && !hasDefined) return new MontantsCategories(zero, total, zero, zero);

            if (!hasDefined) {
                List<Integer> degres = event.getDegresFamille();
                if (degres != null && !degres.isEmpty()) {
                    boolean hasZero = degres.contains(0);
                    boolean hasRealDegree = degres.stream().anyMatch(d -> d != null && d > 0);

                    if (hasRealDegree && !hasZero) return new MontantsCategories(total, zero, zero, zero);
                    if (hasZero && !hasRealDegree) return new MontantsCategories(zero, total, zero, zero);
                }
            }

            return new MontantsCategories(zero, zero, zero, total);
        }

        // DISTRIBUE
        BigDecimal definis = zero;
        BigDecimal mouawiz = zero;

        for (EventParticipant participant : participants) {
            Famille famille = index.resolve(participant);
            BigDecimal montant = safe(participant.getMontant());

            if (famille != null && famille.getDegreFamille() != null) {
                definis = definis.add(montant);
            } else {
                mouawiz = mouawiz.add(montant);
            }
        }

        return new MontantsCategories(definis, mouawiz, zero, safe(event.getChargeSupplementaire()));
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private static void add(Map<Long, BigDecimal> allocation, Long caisseId, BigDecimal montant) {
        if (caisseId == null || montant == null || montant.signum() == 0) return;
        allocation.merge(caisseId, montant, BigDecimal::add);
    }

    private static boolean sameCaisse(EconomicCategory caisse, Long caisseId) {
        return caisse != null && Objects.equals(caisse.getId(), caisseId);
    }

    public static String familleLabel(Famille famille) {
        if (famille == null) return null;
        Mere mere = famille.getMere();
        if (mere != null) {
            String nom = ((mere.getPrenom() != null ? mere.getPrenom() : "") + " "
                    + (mere.getNom() != null ? mere.getNom() : "")).trim();
            if (!nom.isEmpty()) return "أسرة " + nom;
        }
        return "أسرة #" + famille.getId();
    }

    private static Map<String, Object> operation(
            Object id, String type, String sourceType, Object date, String libelle,
            String source, String beneficiaire, String reference, BigDecimal montant
    ) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("type", type);
        row.put("sourceType", sourceType);
        row.put("date", date);
        row.put("libelle", libelle);
        row.put("source", source);
        row.put("beneficiaire", beneficiaire);
        row.put("reference", reference);
        row.put("montant", montant);
        return row;
    }

    private static BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
