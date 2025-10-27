package com.example.backend.Repository;

import com.example.backend.model.Mere;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MereRepository extends JpaRepository<Mere, Long> {
}
