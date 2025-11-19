package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    // 🔵 EventType – ManyToOne
    @ManyToOne
    @JoinColumn(name = "event_type_id", nullable = false)
    private EventType eventType;

    // 🔵 Calendar level (Success, Danger, Primary…)
    @Column(name = "calendar_level", nullable = false)
    private String calendarLevel;

    // Getter & Setter
    public String getCalendarLevel() { return calendarLevel; }
    public void setCalendarLevel(String calendarLevel) { this.calendarLevel = calendarLevel; }


    // 🔵 Cible (MERE, ENFANT, etc.)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Cible cible;

    // 🔵 Age min/max (si ENFANT)
    @Column(name = "age_min")
    private Integer ageMin;

    @Column(name = "age_max")
    private Integer ageMax;


    // --------------------
    // Getters & Setters
    // --------------------

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }



    public Cible getCible() { return cible; }
    public void setCible(Cible cible) { this.cible = cible; }

    public Integer getAgeMin() { return ageMin; }
    public void setAgeMin(Integer ageMin) { this.ageMin = ageMin; }

    public Integer getAgeMax() { return ageMax; }
    public void setAgeMax(Integer ageMax) { this.ageMax = ageMax; }
}
