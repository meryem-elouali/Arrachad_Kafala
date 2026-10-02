package com.example.backend.Repository;

import com.example.backend.model.EconomicReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EconomicReceiptRepository
        extends JpaRepository<EconomicReceipt, Long> {

    List<EconomicReceipt>
    findByAnneeScolaireOrderByDateReceptionDescIdDesc(
            String anneeScolaire
    );

    List<EconomicReceipt>
    findAllByOrderByDateReceptionDescIdDesc();

    boolean existsByCategorieId(Long categorieId);
}
