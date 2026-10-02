package com.example.backend.config;

import com.example.backend.Repository.*;
import com.example.backend.model.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class LajnaSeeder implements CommandLineRunner {

    private final FonctionLajnaRepository fonctions;
    private final MembreLajnaRepository membres;
    private final PasswordEncoder encoder;

    @Value("${lajna.admin.username:jawad}")
    private String adminUser;
    @Value("${lajna.admin.password:ChangeMoi#2026}")
    private String adminPass;

    public LajnaSeeder(FonctionLajnaRepository f, MembreLajnaRepository m, PasswordEncoder e) {
        this.fonctions = f; this.membres = m; this.encoder = e;
    }

    private FonctionLajna fonction(String nom, int ordre, String... perms) {
        return fonctions.findByNom(nom).orElseGet(() -> {
            FonctionLajna f = new FonctionLajna();
            f.setNom(nom);
            f.setOrdre(ordre);
            f.setPermissions(new HashSet<>(Arrays.asList(perms)));
            return fonctions.save(f);
        });
    }

    private MembreLajna membre(String prenom, String nom, FonctionLajna f, String role) {
        return membres.findAll().stream()
                .filter(m -> prenom.equals(m.getPrenom()) && nom.equals(m.getNom()))
                .findFirst()
                .orElseGet(() -> {
                    MembreLajna m = new MembreLajna();
                    m.setPrenom(prenom); m.setNom(nom);
                    m.setFonction(f); m.setRole(role);
                    return membres.save(m);
                });
    }

    @Override
    public void run(String... args) {
        FonctionLajna resp  = fonction("المسؤول", 1, "REUNIONS", "FAMILLES", "ETUDES", "FINANCE", "EVENTS");
        FonctionLajna secr  = fonction("الكتابة", 2, "REUNIONS", "FAMILLES", "EVENTS");
        FonctionLajna educ  = fonction("المسؤولة التربوية", 3, "ETUDES", "FAMILLES");
        FonctionLajna scol  = fonction("مسؤولة ملف التمدرس", 4, "ETUDES");
        FonctionLajna fin   = fonction("المسؤولة المالية", 5, "FINANCE", "EVENTS");
        FonctionLajna media = fonction("الإعلام", 6, "EVENTS");

        MembreLajna jawad = membre("جواد", "خلفي", resp, "SUPER_ADMIN");
        membre("مريم", "الوالي", secr, "SIMPLE");
        membre("سعاد", "فرزى", educ, "SIMPLE");
        membre("نعيمة", "الركراكي", scol, "SIMPLE");
        membre("ليلى", "لوداري", fin, "SIMPLE");
        membre("محجوبة", "القاضي", media, "SIMPLE");

        if (jawad.getUsername() == null) {
            jawad.setUsername(adminUser);
            jawad.setMotDePasse(encoder.encode(adminPass));
            jawad.setCompteActif(true);
            membres.save(jawad);
            System.out.println("[LAJNA] Super admin créé : " + adminUser);
        }
    }
}