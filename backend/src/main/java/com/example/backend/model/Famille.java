// Famille.java
package com.example.backend.model;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "famille")
public class Famille {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String adresseFamille;
    private Integer nombreEnfants;
    private String phone;
    private String dateInscription;

    @ManyToOne
    @JoinColumn(name = "type_famille_id")
    private TypeFamille typeFamille;

    @ManyToOne
    @JoinColumn(name = "habitation_id")
    private Habitation habitationFamille;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "mere_id", referencedColumnName = "id")
    private Mere mere;
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "pere_id", referencedColumnName = "id")

    private Pere Pere;
    @OneToMany(mappedBy = "famille", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Enfant> enfants = new ArrayList<>();


    // Getters / Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAdresseFamille() { return adresseFamille; }
    public void setAdresseFamille(String adresseFamille) { this.adresseFamille = adresseFamille; }
    public Integer getNombreEnfants() { return nombreEnfants; }
    public void setNombreEnfants(Integer nombreEnfants) { this.nombreEnfants = nombreEnfants; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDateInscription() { return dateInscription; }
    public void setDateInscription(String dateInscription) { this.dateInscription = dateInscription; }
    public TypeFamille getTypeFamille() { return typeFamille; }
    public void setTypeFamille(TypeFamille typeFamille) { this.typeFamille = typeFamille; }
    public Habitation getHabitationFamille() { return habitationFamille; }
    public void setHabitationFamille(Habitation habitationFamille) { this.habitationFamille = habitationFamille; }
    public Mere getMere() { return mere; }
    public void setMere(Mere mere) { this.mere = mere; }

    public Pere getPere() {
        return Pere;
    }

    public void setPere(Pere pere) {
        Pere = pere;
    }
    public List<Enfant> getEnfants() { return enfants; }
    public void setEnfants(List<Enfant> enfants) {
        this.enfants = enfants;


    }
}
