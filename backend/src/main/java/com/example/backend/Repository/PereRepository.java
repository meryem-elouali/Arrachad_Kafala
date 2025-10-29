package com.example.backend.Repository;

import com.example.backend.model.Pere;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PereRepository extends JpaRepository<Pere, Long> {
}
