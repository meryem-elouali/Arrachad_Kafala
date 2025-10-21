package com.example.backend.service;

import com.example.backend.model.User;
import com.example.backend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User authenticate(String nomPrenom, String password) {
        User user = userRepository.findByNomPrenom(nomPrenom);
        if (user != null && user.getPassword().equals(password)) {
            return user;
        }
        return null;
    }
}
