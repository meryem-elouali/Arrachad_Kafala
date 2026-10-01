package com.example.backend.dto;

public interface SoutienEnfantStat {

    Long getEnfantId();

    Double getTotalConsomme();

    Double getTotalPaye();

    Double getTotalAutre();

    Long getNombrePaiements();
}