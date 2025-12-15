package com.example.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIdentityReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
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
    @Column(name = "personne_malade") // correspond à la colonne de la DB
    private String personneMalade;

    public String getPersonneMalade() {
        return personneMalade;
    }

    public void setPersonneMalade(String personneMalade) {
        this.personneMalade = personneMalade;
    }

    @Column(name = "possede_malade") // correspond à la colonne de la DB
    private Boolean possedeMalade = false;

    public Boolean getPossedeMalade() {
        return possedeMalade;
    }

    public void setPossedeMalade(Boolean possedeMalade) {
        this.possedeMalade = possedeMalade;
    }
    @ManyToOne
    @JoinColumn(name = "type_famille_id")
    private TypeFamille typeFamille;

    @ManyToOne
    @JoinColumn(name = "habitation_id")
    private Habitation habitationFamille;

    @ManyToOne
    @JoinColumn(name = "mere_id")
    @JsonIdentityReference(alwaysAsId = true) // sérialiser juste l'ID
    private Mere mere;

    @ManyToOne
    @JoinColumn(name = "pere_id")
    @JsonIdentityReference(alwaysAsId = true) // sérialiser juste l'ID
    private Pere pere;

    @OneToMany(mappedBy = "famille", cascade = CascadeType.ALL)
    @JsonManagedReference  // pour Enfant
    private List<Enfant> enfants;

    @OneToMany(mappedBy = "famille", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<EventParticipant> eventParticipants = new ArrayList<>();



    @Transient
    public List<Event> getEvents() {
        if (eventParticipants == null) {
            return List.of(); // retourne une liste vide
        }
        return eventParticipants.stream()
                .map(EventParticipant::getEvent)
                .toList();
    }

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

    public Pere getPere() { return pere; } // <-- getter corrigé
    public void setPere(Pere pere) { this.pere = pere; } // <-- setter corrigé

    public List<Enfant> getEnfants() { return enfants; }
    public void setEnfants(List<Enfant> enfants) { this.enfants = enfants; }


}
