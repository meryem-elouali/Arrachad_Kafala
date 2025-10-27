package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "famille")
public class Famille {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "type_famille_id")
    private TypeFamille typeFamille;

    @ManyToOne
    @JoinColumn(name = "habitation_id")
    private Habitation habitationFamille;

    @Column(name = "adresse")
    private String adresseFamille;

    @Column(name = "nombre_enfants")
    private Integer nombreEnfants;

    @Column(name = "phone")
    private String phone;

    @Column(name = "date_inscription")
    private LocalDate dateInscription;

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public TypeFamille getTypeFamille() { return typeFamille; }
    public void setTypeFamille(TypeFamille typeFamille) { this.typeFamille = typeFamille; }

    public Habitation getHabitationFamille() { return habitationFamille; }
    public void setHabitationFamille(Habitation habitationFamille) { this.habitationFamille = habitationFamille; }

    public String getAdresseFamille() { return adresseFamille; }
    public void setAdresseFamille(String adresseFamille) { this.adresseFamille = adresseFamille; }

    public Integer getNombreEnfants() { return nombreEnfants; }
    public void setNombreEnfants(Integer nombreEnfants) { this.nombreEnfants = nombreEnfants; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public LocalDate getDateInscription() { return dateInscription; }
    public void setDateInscription(LocalDate dateInscription) { this.dateInscription = dateInscription; }
}
