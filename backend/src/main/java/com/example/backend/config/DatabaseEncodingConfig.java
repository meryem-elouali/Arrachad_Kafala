package com.example.backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

@Configuration
public class DatabaseEncodingConfig {

    @Bean
    public ApplicationRunner forceUtf8Database(JdbcTemplate jdbcTemplate) {

        return args -> {

            System.out.println("==========================================");
            System.out.println("Vérification encodage MySQL UTF-8...");
            System.out.println("==========================================");

            // =====================================================
            // 1. Récupérer automatiquement le nom de la base
            // =====================================================
            String databaseName =
                    jdbcTemplate.queryForObject(
                            "SELECT DATABASE()",
                            String.class
                    );

            if (databaseName == null || databaseName.isBlank()) {
                System.out.println(
                        "Impossible de déterminer la base de données."
                );
                return;
            }

            String safeDatabaseName =
                    databaseName.replace("`", "``");

            // =====================================================
            // 2. Mettre la base en UTF8MB4
            // =====================================================
            jdbcTemplate.execute(
                    "ALTER DATABASE `" +
                            safeDatabaseName +
                            "` CHARACTER SET utf8mb4 " +
                            "COLLATE utf8mb4_unicode_ci"
            );

            System.out.println(
                    "Base `" +
                            databaseName +
                            "` configurée en utf8mb4."
            );

            // =====================================================
            // 3. Chercher toutes les tables contenant encore
            //    des colonnes non-utf8mb4
            // =====================================================
            List<String> tablesToConvert =
                    jdbcTemplate.queryForList(
                            """
                            SELECT DISTINCT TABLE_NAME
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND CHARACTER_SET_NAME IS NOT NULL
                              AND CHARACTER_SET_NAME <> 'utf8mb4'
                            """,
                            String.class
                    );

            // =====================================================
            // 4. Convertir automatiquement chaque table
            // =====================================================
            for (String table : tablesToConvert) {

                String safeTable =
                        table.replace("`", "``");

                System.out.println(
                        "Conversion UTF-8 de la table : " +
                                table
                );

                jdbcTemplate.execute(
                        "ALTER TABLE `" +
                                safeTable +
                                "` " +
                                "CONVERT TO CHARACTER SET utf8mb4 " +
                                "COLLATE utf8mb4_unicode_ci"
                );
            }

            // =====================================================
            // 5. Vérification
            // =====================================================
            List<String> remainingTables =
                    jdbcTemplate.queryForList(
                            """
                            SELECT DISTINCT TABLE_NAME
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND CHARACTER_SET_NAME IS NOT NULL
                              AND CHARACTER_SET_NAME <> 'utf8mb4'
                            """,
                            String.class
                    );

            if (remainingTables.isEmpty()) {

                System.out.println(
                        "✅ Toutes les colonnes texte sont en utf8mb4."
                );

            } else {

                System.err.println(
                        "⚠️ Certaines tables ne sont pas encore en utf8mb4 : "
                                + remainingTables
                );
            }

            System.out.println("==========================================");
        };
    }
}