package com.example.backend.config;

import com.example.backend.Repository.MembreLajnaRepository;
import com.example.backend.model.MembreLajna;
import org.springframework.stereotype.Service;

@Service
public class AccesService {

    private final MembreLajnaRepository membres;

    public AccesService(MembreLajnaRepository membres) { this.membres = membres; }

    public static boolean isSuper(MembreLajna m) { return m != null && "SUPER_ADMIN".equals(m.getRole()); }
    public static boolean isAdmin(MembreLajna m) { return isSuper(m) || (m != null && "ADMIN".equals(m.getRole())); }

    public MembreLajna acteur(Long id) {
        if (id == null) throw new HttpError(401, "سجّل الدخول أولا");
        MembreLajna m = membres.findById(id).orElseThrow(() -> new HttpError(401, "مستخدم غير معروف"));
        if (!Boolean.TRUE.equals(m.getCompteActif())) throw new HttpError(403, "الحساب موقوف");
        return m;
    }

    public MembreLajna admin(Long id) {
        MembreLajna m = acteur(id);
        if (!isAdmin(m)) throw new HttpError(403, "غير مسموح: للمشرفين فقط");
        return m;
    }

    public MembreLajna superAdmin(Long id) {
        MembreLajna m = acteur(id);
        if (!isSuper(m)) throw new HttpError(403, "غير مسموح: للمسؤول الأعلى فقط");
        return m;
    }
}