package com.example.backend.Controller;

import com.example.backend.Repository.EtudeRepository;
import com.example.backend.model.Etude;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/etudes")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")

public class EtudeController {

    @Autowired
    private EtudeRepository etudeRepository;

    @GetMapping("/latest")
    public List<Etude> getLatestEtudes() {
        return etudeRepository.findLatestEtudes();
    }
}
