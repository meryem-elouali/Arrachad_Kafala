package com.example.backend.Repository;

import com.example.backend.model.Famille;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FamilleRepository extends JpaRepository<Famille, Long> {

    // 🔹 Récupérer familles avec mère, père et enfants
    @Query("SELECT f FROM Famille f " +
            "LEFT JOIN FETCH f.mere " +
            "LEFT JOIN FETCH f.pere " +
            "LEFT JOIN FETCH f.enfants")
    List<Famille> findAllWithRelations();
}
