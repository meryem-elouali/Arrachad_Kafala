package com.example.backend.Controller;

import com.example.backend.Repository.EnfantRepository;
import com.example.backend.Repository.MereRepository;
import com.example.backend.model.Enfant;
import com.example.backend.model.Mere;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class ParticipantController {

    @Autowired
    private MereRepository mereRepository;

    @Autowired
    private EnfantRepository enfantRepository;

    // Toutes les mères
    @GetMapping("/meres")
    public List<Mere> getAllMeres() {
        return mereRepository.findAll();
    }

    @GetMapping("/enfants")
    public List<Enfant> getEnfantsByAge(@RequestParam int minAge, @RequestParam int maxAge) {
        return enfantRepository.findAll().stream()
                .filter(e -> e.getAge() >= minAge && e.getAge() <= maxAge)
                .collect(Collectors.toList());
    }


}
