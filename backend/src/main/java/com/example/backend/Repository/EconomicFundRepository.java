package com.example.backend.Repository;

import com.example.backend.model.EconomicFund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EconomicFundRepository
        extends JpaRepository<EconomicFund, Long> {

    Optional<EconomicFund> findByCode(String code);

    List<EconomicFund> findByActiveTrueOrderByOrdreAsc();
}