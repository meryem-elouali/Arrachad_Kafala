package com.example.backend.Controller;

import com.example.backend.Repository.*;
import com.example.backend.config.*;
import com.example.backend.model.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/lajna")
public class LajnaController {

    private static final List<String> ROLES = List.of("SUPER_ADMIN", "ADMIN", "SIMPLE");
    private static final String H = "X-User-Id";

    private final FonctionLajnaRepository fonctions;
    private final MembreLajnaRepository membres;
    private final PasswordEncoder encoder;
    private final AccesService acces;

    public LajnaController(FonctionLajnaRepository f, MembreLajnaRepository m,
                           PasswordEncoder e, AccesService a) {
        this.fonctions = f; this.membres = m; this.encoder = e; this.acces = a;
    }

    // ---------- Connexion (publique) ----------
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> b) {
        MembreLajna m = membres.findByUsername(b.getOrDefault("username", "").trim()).orElse(null);
        if (m == null || !Boolean.TRUE.equals(m.getCompteActif()) || m.getMotDePasse() == null
                || !encoder.matches(b.getOrDefault("password", ""), m.getMotDePasse()))
            return ResponseEntity.status(401).body("بيانات الدخول غير صحيحة");

        m.setDerniereConnexion(LocalDateTime.now());
        membres.save(m);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", m.getId());
        out.put("username", m.getUsername());
        out.put("nomComplet", m.getNomComplet());
        out.put("role", m.getRole() == null ? "SIMPLE" : m.getRole());
        out.put("fonction", m.getFonction() == null ? "" : m.getFonction().getNom());
        out.put("permissions", m.getFonction() == null ? Set.of() : m.getFonction().getPermissions());
        return ResponseEntity.ok(out);
    }

    // ---------- Fonctions ----------
    @GetMapping("/fonctions")
    public List<FonctionLajna> listFonctions(@RequestHeader(value = H, required = false) Long uid) {
        acces.acteur(uid);
        return fonctions.findAll().stream()
                .sorted(Comparator.comparing(FonctionLajna::getOrdre, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    @PostMapping("/fonctions")
    public FonctionLajna addFonction(@RequestBody FonctionLajna f,
                                     @RequestHeader(value = H, required = false) Long uid) {
        acces.admin(uid);
        if (f.getNom() == null || f.getNom().isBlank()) throw new HttpError(400, "أدخل اسم الوظيفة");
        if (fonctions.findByNom(f.getNom().trim()).isPresent()) throw new HttpError(409, "الوظيفة موجودة");
        f.setId(null);
        f.setNom(f.getNom().trim());
        return fonctions.save(f);
    }

    @PutMapping("/fonctions/{id}")
    public FonctionLajna updFonction(@PathVariable Long id, @RequestBody FonctionLajna f,
                                     @RequestHeader(value = H, required = false) Long uid) {
        acces.admin(uid);
        FonctionLajna ex = fonctions.findById(id).orElseThrow();
        ex.setNom(f.getNom().trim());
        ex.setOrdre(f.getOrdre());
        ex.setPermissions(f.getPermissions() == null ? new HashSet<>() : new HashSet<>(f.getPermissions()));
        return fonctions.save(ex);
    }

    @DeleteMapping("/fonctions/{id}")
    public ResponseEntity<?> delFonction(@PathVariable Long id,
                                         @RequestHeader(value = H, required = false) Long uid) {
        acces.admin(uid);
        if (membres.countByFonctionId(id) > 0)
            return ResponseEntity.status(409).body("لا يمكن حذف وظيفة مرتبطة بأعضاء");
        fonctions.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ---------- Membres ----------
    @GetMapping("/membres")
    public List<MembreLajna> listMembres(@RequestHeader(value = H, required = false) Long uid) {
        acces.acteur(uid);
        return membres.findAll().stream()
                .sorted(Comparator.comparing(m -> m.getFonction() == null || m.getFonction().getOrdre() == null
                        ? 99 : m.getFonction().getOrdre()))
                .toList();
    }

    @GetMapping("/membres/{id}")
    public MembreLajna getMembre(@PathVariable Long id,
                                 @RequestHeader(value = H, required = false) Long uid) {
        MembreLajna a = acces.acteur(uid);
        if (!a.getId().equals(id) && !AccesService.isAdmin(a)) throw new HttpError(403, "غير مسموح");
        return membres.findById(id).orElseThrow();
    }

    private MembreLajna fill(MembreLajna m, Map<String, Object> b) {
        String nom = b.get("nom") == null ? "" : b.get("nom").toString().trim();
        if (nom.isEmpty()) throw new HttpError(400, "أدخل النسب");
        m.setNom(nom);
        m.setPrenom(b.get("prenom") == null ? null : b.get("prenom").toString().trim());
        m.setPhone(b.get("phone") == null ? null : b.get("phone").toString().trim());
        Object fid = b.get("fonctionId");
        m.setFonction(fid == null || fid.toString().isBlank()
                ? null : fonctions.findById(((Number) fid).longValue()).orElse(null));
        return m;
    }

    // ---------- Création d'un utilisateur (super admin) ----------
    @PostMapping("/utilisateurs")
    public MembreLajna creerUtilisateur(@RequestBody Map<String, Object> b,
                                        @RequestHeader(value = H, required = false) Long uid) {
        acces.superAdmin(uid);

        String username = b.getOrDefault("username", "").toString().trim();
        String password = b.getOrDefault("password", "").toString();
        String role = b.getOrDefault("role", "SIMPLE").toString();

        if (username.length() < 3) throw new HttpError(400, "اسم المستخدم 3 أحرف على الأقل");
        if (password.length() < 6) throw new HttpError(400, "كلمة السر 6 أحرف على الأقل");
        if (!ROLES.contains(role)) throw new HttpError(400, "دور غير صالح");
        if (membres.findByUsername(username).isPresent()) throw new HttpError(409, "اسم المستخدم مستعمل");

        MembreLajna m = new MembreLajna();
        fill(m, b);
        m.setRole(role);
        m.setUsername(username);
        m.setMotDePasse(encoder.encode(password));
        m.setCompteActif(true);
        return membres.save(m);
    }

    // ---------- Rôle (super admin) ----------
    @PutMapping("/membres/{id}/role")
    public MembreLajna changeRole(@PathVariable Long id, @RequestBody Map<String, String> b,
                                  @RequestHeader(value = H, required = false) Long uid) {
        MembreLajna a = acces.superAdmin(uid);
        String role = b.getOrDefault("role", "SIMPLE");
        if (!ROLES.contains(role)) throw new HttpError(400, "دور غير صالح");
        if (a.getId().equals(id)) throw new HttpError(400, "لا يمكنك تغيير دورك بنفسك");
        MembreLajna cible = membres.findById(id).orElseThrow();
        cible.setRole(role);
        return membres.save(cible);
    }

    // ---------- Compte : création / nouveau mot de passe ----------
    @PostMapping("/membres/{id}/compte")
    public MembreLajna creerCompte(@PathVariable Long id, @RequestBody Map<String, String> b,
                                   @RequestHeader(value = H, required = false) Long uid) {
        MembreLajna a = acces.admin(uid);
        MembreLajna m = membres.findById(id).orElseThrow();
        if (AccesService.isSuper(m) && !AccesService.isSuper(a))
            throw new HttpError(403, "لا يمكنك تعديل حساب المسؤول الأعلى");

        String username = b.getOrDefault("username", "").trim();
        String password = b.getOrDefault("password", "");
        if (username.length() < 3) throw new HttpError(400, "اسم المستخدم 3 أحرف على الأقل");
        if (password.length() < 6) throw new HttpError(400, "كلمة السر 6 أحرف على الأقل");
        if (membres.findByUsername(username).filter(x -> !x.getId().equals(id)).isPresent())
            throw new HttpError(409, "اسم المستخدم مستعمل");

        m.setUsername(username);
        m.setMotDePasse(encoder.encode(password));
        m.setCompteActif(true);
        return membres.save(m);
    }

    @PutMapping("/membres/{id}/compte/actif")
    public MembreLajna toggleCompte(@PathVariable Long id, @RequestBody Map<String, Boolean> b,
                                    @RequestHeader(value = H, required = false) Long uid) {
        MembreLajna a = acces.admin(uid);
        MembreLajna m = membres.findById(id).orElseThrow();
        if (a.getId().equals(id)) throw new HttpError(400, "لا يمكنك إيقاف حسابك");
        if (AccesService.isSuper(m) && !AccesService.isSuper(a))
            throw new HttpError(403, "لا يمكنك إيقاف حساب المسؤول الأعلى");
        m.setCompteActif(Boolean.TRUE.equals(b.get("actif")));
        return membres.save(m);
    }

    // ---------- Profil personnel ----------
    @PutMapping("/membres/{id}/profil")
    public MembreLajna updProfil(@PathVariable Long id, @RequestBody Map<String, String> b,
                                 @RequestHeader(value = H, required = false) Long uid) {
        MembreLajna a = acces.acteur(uid);
        if (!a.getId().equals(id)) throw new HttpError(403, "يمكنك تعديل ملفك فقط");
        if (b.get("nom") != null && !b.get("nom").isBlank()) a.setNom(b.get("nom").trim());
        if (b.get("prenom") != null) a.setPrenom(b.get("prenom").trim());
        if (b.get("phone") != null) a.setPhone(b.get("phone").trim());
        return membres.save(a);
    }

    @PutMapping("/membres/{id}/mot-de-passe")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestBody Map<String, String> b,
                                            @RequestHeader(value = H, required = false) Long uid) {
        MembreLajna a = acces.acteur(uid);
        if (!a.getId().equals(id)) throw new HttpError(403, "يمكنك تغيير كلمة سرك فقط");
        if (a.getMotDePasse() == null || !encoder.matches(b.getOrDefault("ancien", ""), a.getMotDePasse()))
            return ResponseEntity.status(401).body("كلمة السر الحالية غير صحيحة");
        String nouveau = b.getOrDefault("nouveau", "");
        if (nouveau.length() < 6) return ResponseEntity.badRequest().body("كلمة السر الجديدة 6 أحرف على الأقل");
        a.setMotDePasse(encoder.encode(nouveau));
        membres.save(a);
        return ResponseEntity.ok().build();
    }
}