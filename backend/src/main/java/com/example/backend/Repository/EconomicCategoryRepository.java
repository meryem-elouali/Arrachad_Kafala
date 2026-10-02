package com.example.backend.Repository;

import com.example.backend.model.EconomicCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EconomicCategoryRepository
        extends JpaRepository<EconomicCategory, Long> {

    Optional<EconomicCategory> findByCode(String code);

    Optional<EconomicCategory> findByNomIgnoreCase(String nom);

    List<EconomicCategory> findAllByOrderByOrdreAscNomAsc();

    List<EconomicCategory> findByActiveTrueOrderByOrdreAscNomAsc();
}
