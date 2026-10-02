package com.example.backend.Repository;

import com.example.backend.model.EconomicIncome;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EconomicIncomeRepository
        extends JpaRepository<EconomicIncome, Long> {

    List<EconomicIncome>
    findByAnneeScolaire(String anneeScolaire);
}