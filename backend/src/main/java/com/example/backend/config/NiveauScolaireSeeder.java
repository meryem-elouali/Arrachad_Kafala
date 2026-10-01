package com.example.backend.config;

import com.example.backend.Repository.NiveauScolaireRepository;
import com.example.backend.model.NiveauScolaire;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class NiveauScolaireSeeder implements CommandLineRunner {

    private final NiveauScolaireRepository repo;

    public NiveauScolaireSeeder(NiveauScolaireRepository repo) {
        this.repo = repo;
    }

    private static final List<String> NIVEAUX = List.of(

            // =====================================================
            // التعليم الأولي - PRÉSCOLAIRE
            // =====================================================
            "التعليم الأولي - الروض (القسم الصغير)",
            "التعليم الأولي - الروض (القسم المتوسط)",
            "التعليم الأولي - الروض (القسم الكبير)",

            // =====================================================
            // التعليم الابتدائي - PRIMAIRE
            // =====================================================
            "التعليم الابتدائي - السنة الأولى",
            "التعليم الابتدائي - السنة الثانية",
            "التعليم الابتدائي - السنة الثالثة",
            "التعليم الابتدائي - السنة الرابعة",
            "التعليم الابتدائي - السنة الخامسة",
            "التعليم الابتدائي - السنة السادسة",

            // =====================================================
            // التعليم الإعدادي - COLLÈGE
            // =====================================================
            "التعليم الإعدادي - السنة الأولى",
            "التعليم الإعدادي - السنة الثانية",
            "التعليم الإعدادي - السنة الثالثة",

            // =====================================================
            // التعليم الثانوي التأهيلي - LYCÉE
            // =====================================================
            "التعليم الثانوي التأهيلي - الجذع المشترك",
            "التعليم الثانوي التأهيلي - السنة الأولى باكالوريا",
            "التعليم الثانوي التأهيلي - السنة الثانية باكالوريا",

            // =====================================================
            // التعليم الجامعي - UNIVERSITÉ / SUPÉRIEUR
            // =====================================================
            "التعليم الجامعي - السنة الأولى (باك + 1)",
            "التعليم الجامعي - السنة الثانية (باك + 2)",
            "التعليم الجامعي - السنة الثالثة (باك + 3)",
            "التعليم الجامعي - السنة الرابعة (باك + 4)",
            "التعليم الجامعي - السنة الخامسة (باك + 5)",
            "التعليم الجامعي - السنة السادسة (باك + 6)",
            "التعليم الجامعي - السنة السابعة (باك + 7)"
    );

    @Override
    public void run(String... args) {

        Set<String> existing = new HashSet<>();

        repo.findAll().forEach(
                niveau -> existing.add(niveau.getNom())
        );

        for (String nom : NIVEAUX) {

            if (!existing.contains(nom)) {

                NiveauScolaire niveau = new NiveauScolaire();

                niveau.setNom(nom);

                repo.save(niveau);

                existing.add(nom);
            }
        }
    }
}