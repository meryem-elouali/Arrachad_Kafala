package com.example.backend.Controller;

import com.example.backend.model.User;
import com.example.backend.Repository.UserRepository;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/auth")
//@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserRepository userRepository;
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public String login(@RequestBody User user) {
        try {
            logger.info("Tentative de connexion pour : " + user.getNomPrenom());

            User existing = userRepository.findByNomPrenom(user.getNomPrenom());
            if (existing == null) {
                logger.warn("Utilisateur non trouvé : " + user.getNomPrenom());
                return "Utilisateur non trouvé";
            }

            if (!existing.getPassword().equals(user.getPassword())) {
                logger.warn("Mot de passe incorrect pour : " + user.getNomPrenom());
                return "Mot de passe incorrect";
            }

            logger.info("Connexion réussie pour : " + user.getNomPrenom() + " avec rôle : " + existing.getRole());
            return existing.getRole();
        } catch (Exception e) {
            logger.error("Erreur serveur lors de la connexion : ", e);
            // Retourner le message d'erreur exact pour debug (à sécuriser en production)
            return "Erreur serveur: " + e.getMessage();
        }
    }

}
