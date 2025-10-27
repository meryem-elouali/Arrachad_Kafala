package com.example.backend.service;

import com.example.backend.Repository.MereRepository;
import com.example.backend.model.Mere;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MereService {

    private final MereRepository mereRepository;

    public MereService(MereRepository mereRepository) {
        this.mereRepository = mereRepository;
    }

    public Mere saveMere(Mere mere) {
        return mereRepository.save(mere);
    }

    public List<Mere> getAllMeres() {
        return mereRepository.findAll();
    }
}
