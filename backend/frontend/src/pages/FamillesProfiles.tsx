import { useState, useEffect } from "react";
import { useRef } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { Modal } from "../components/ui/modal";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { FaCheck, FaTimes } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas';

interface Option {
  value: number;
  label: string;
}

const Select = ({ options = [], value, onChange, placeholder, apiUrl, onNewItem }: any) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [opts, setOpts] = useState<Option[]>(options);

  useEffect(() => setOpts(options), [options]);

  const handleSelect = (opt: Option) => {
    onChange(opt.value); // garder number
    setOpen(false);
  };

  const handleAddOption = async () => {
    if (!newOption.trim()) return;
    if (!apiUrl) {
      alert("Erreur: URL API manquante pour ajouter un élément.");
      return;
    }
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newOption }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const savedItem = await res.json();
      const newOpt = { value: savedItem.id, label: savedItem.nom }; // number
      setOpts((prev) => [...prev, newOpt]);
      if (onNewItem) onNewItem(newOpt);
      onChange(newOpt.value); // sélection automatique
      setNewOption("");
      setAdding(false);
      setOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      alert("Erreur lors de l'ajout de l'élément. Vérifiez la connexion.");
    }
  };
  return (
    <div className="relative w-full">
      <div className="border border-gray-300 rounded-lg px-4 py-2 cursor-pointer" onClick={() => setOpen(!open)}>
        {opts.find((o) => o.value === value)?.label || placeholder}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full border border-gray-300 rounded-lg bg-white shadow-lg max-h-60 overflow-auto">
          {opts.map((opt) => (
            <div key={opt.value} className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelect(opt)}>
              {opt.label}
            </div>
          ))}
          {!adding ? (
            <div className="px-4 py-2 text-blue-600 cursor-pointer hover:bg-gray-100" onClick={() => setAdding(true)}>
              + Ajouter un élément
            </div>
          ) : (
            <div className="flex px-4 py-2 gap-2 items-center">
              <Input type="text" placeholder="Nouvel élément" value={newOption} onChange={(e) => setNewOption(e.target.value)} className="border p-1 rounded w-full" />
              <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAddOption}>
                <FaCheck />
              </button>
              <button type="button" className="px-3 py-1 bg-gray-300 text-black rounded" onClick={() => setAdding(false)}>
                <FaTimes />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface Enfant {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance: string;
  photoEnfant?: string;
  typeMaladie: string;
    estMalade: boolean;
     niveauscolaire?: {
        id: number;
        nom: string;
      };
   familleId: number;
}

interface Famille {
  id: number;
  nomFamille?: string;
  adresseFamille: string;
  phone: string;
  nombreEnfants: number;
  dateInscription: string;
  typeMaladie: string;
  estMalade: boolean;
  mere?: { photoMere?: string; nom: string; prenom: string; phone: string; cin: string; dateNaissance: string; villeNaissance: string; estMalade: boolean; typeMaladie?: string; estTravaille?: boolean; typeTravail?: string };
  pere?: { photoPere?: string; nom: string; prenom: string };
  typeFamille?: { id: number; nom: string };
  habitationFamille?: { id: number; nom: string };
  enfants?: Enfant[];
}

export default function FamillesProfiles() {
  const [modalType, setModalType] = useState<null | "العائلة" | "address" | "Mere">(null); // 👈 Ajouté "Mere" au type
  const [famille, setFamille] = useState<Famille | null>(null);
  const [habitations, setHabitations] = useState<Option[]>([]);
  const [typesFamilles, setTypesFamilles] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [mereFormLoaded, setMereFormLoaded] = useState(false); // 👈 Ajouté pour gérer le chargement de mereForm
   const [pereFormLoaded, setPereFormLoaded] = useState(false);
const [currentEnfant, setCurrentEnfant] = useState<Enfant | null>(null);
const [niveauxScolaires, setNiveauxScolaires] = useState<Option[]>([]);

  const [formData, setFormData] = useState({
    typeFamilleId: 0,
    habitationFamilleId: 0,
    adresseFamille: "",
    phone: "",
    dateInscription: "",
    possedeMalade: false,
    personneMalade: ""
  });
  const [mereForm, setMereForm] = useState({
    nom: "",
    prenom: "",
    phone: "",
    cin: "",
    dateNaissance: "",
    villeNaissance: "",
    estMalade: false,
    typeMaladie: "",
    estTravaille: false,
    typeTravail: "",
    photoMere: "",
     estDecedee: false,
      dateDeces: "" // ⚠ initialiser pour controlled input
  });
   const [pereForm, setPereForm] = useState({
      nom: "",
      prenom: "",
      phone: "",
      cin: "",
      dateNaissance: "",
      villeNaissance: "",
      estMalade: false,
      typeMaladie: "",
      estTravaille: false,
      typeTravail: "",
      photoPere: "",
       estDecedee: false,
        dateDeces: "" // ⚠ initialiser pour controlled input
    });
  const [enfantForm, setEnfantForm] = useState({
    id: 0,
    nom: "",
    prenom: "",
    dateNaissance: "",
    estMalade: false,
    typeMaladie: "",
     photoEnfant: "",
    niveauscolaireId: 0,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result?.toString().split(",")[1] || "";
      setMereForm(prev => ({ ...prev, photoMere: base64String }));
    };
    reader.readAsDataURL(file);
  };
   const handlePhotoChangePere = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(",")[1] || "";
        setPereForm(prev => ({ ...prev, photoPere: base64String }));
      };
      reader.readAsDataURL(file);
    };
  const handlePhotoChangeEnfant = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(",")[1] || "";
        setEnfantForm(prev => ({ ...prev, photoEnfant: base64String }));
      };
      reader.readAsDataURL(file);
    };
useEffect(() => {
  const fetchNiveaux = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/enfant/niveauScolaire");
      const data = await res.json();
      setNiveauxScolaires(data.map((n: any) => ({ value: n.id, label: n.nom })));
    } catch (err) {
      console.error("Erreur fetch niveaux scolaires:", err);
    }
  };
  fetchNiveaux();
}, []);

  useEffect(() => {
    if (famille?.mere) {
      setMereForm({
        nom: famille.mere.nom || "",
        prenom: famille.mere.prenom || "",
        phone: famille.mere.phone || "",
        cin: famille.mere.cin || "",
        dateNaissance: famille.mere.dateNaissance || "",
        villeNaissance: famille.mere.villeNaissance || "",
        estMalade: famille.mere.estMalade || false,
        typeMaladie: famille.mere.typeMaladie || "",
        estTravaille: famille.mere.estTravaille || false,
        typeTravail: famille.mere.typeTravail || "",
        photoMere: famille.mere.photoMere || "" ,
           estDecedee: famille.mere.estDecedee ?? false,
                dateDeces: famille.mere.dateDeces || ""

      });
      setMereFormLoaded(true); // 👈 Marque mereForm comme chargé
    }
  }, [famille]);
   useEffect(() => {
      if (famille?.pere) {
        setPereForm({
          nom: famille.pere.nom || "",
          prenom: famille.pere.prenom || "",
          phone: famille.pere.phone || "",
          cin: famille.pere.cin || "",
          dateNaissance: famille.pere.dateNaissance || "",
          villeNaissance: famille.pere.villeNaissance || "",
          estMalade: famille.pere.estMalade || false,
          typeMaladie: famille.pere.typeMaladie || "",
          estTravaille: famille.pere.estTravaille || false,
          typeTravail: famille.pere.typeTravail || "",
          photoPere: famille.pere.photoPere || "" ,
             estDecedee: famille.pere.estDecedee ?? false,
                  dateDeces: famille.pere.dateDeces || ""

        });
        setPereFormLoaded(true); // 👈 Marque mereForm comme chargé
      }
    }, [famille]);
useEffect(() => {
  if (currentEnfant) {
    setEnfantForm({
      id: currentEnfant.id,
      nom: currentEnfant.nom || "",
      prenom: currentEnfant.prenom || "",
      dateNaissance: currentEnfant.dateNaissance || "",
      estMalade: currentEnfant.estMalade || false,
      typeMaladie: currentEnfant.typeMaladie || "",
        photoEnfant: currentEnfant.photoEnfant || "" ,
      niveauscolaireId: currentEnfant.niveauscolaire?.id || 0
    });
  }
}, [currentEnfant]);

  // Fonction handleChange spécifique mère
  const handleMereChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;

    setMereForm(prev => {
      if (type === "checkbox") {
        if (name === "estDecedee") {
          const updated = { ...prev, estDecedee: checked };
          if (checked) {
            updated.phone = "";
            updated.cin = "";
            updated.dateNaissance = "";
            updated.villeNaissance = "";
            updated.estMalade = false;
            updated.typeMaladie = "";
            updated.estTravaille = false;
            updated.typeTravail = "";
          }
          return updated;
        }
        const updated = { ...prev, [name]: checked };
        if (name === "estMalade" && !checked) updated.typeMaladie = "";
        if (name === "estTravaille" && !checked) updated.typeTravail = "";
        return updated;
      }

      return { ...prev, [name]: value };
    });
  };
 const handlePereChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;

    setPereForm(prev => {
      if (type === "checkbox") {
        if (name === "estDecedee") {
          const updated = { ...prev, estDecedee: checked };
          if (checked) {
            updated.phone = "";
            updated.cin = "";
            updated.dateNaissance = "";
            updated.villeNaissance = "";
            updated.estMalade = false;
            updated.typeMaladie = "";
            updated.estTravaille = false;
            updated.typeTravail = "";
          }
          return updated;
        }
        const updated = { ...prev, [name]: checked };
        if (name === "estMalade" && !checked) updated.typeMaladie = "";
        if (name === "estTravaille" && !checked) updated.typeTravail = "";
        return updated;
      }

      return { ...prev, [name]: value };
    });
  };

  // Fonction save mère
  const handleSaveMere = async () => {
    if (!famille) return;
    try {
        console.log("Données à envoyer:", mereForm);

   const res = await fetch(`http://localhost:8080/api/famille/${famille.id}/mere`, {
     method: "PUT",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(mereForm),
     credentials: "include",
     mode: "cors" // 🔹 ajouté
   });


      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const updatedMere = await res.json();
      setFamille(prev => prev ? { ...prev, mere: updatedMere } : prev);
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour de la mère");
    }
  };
const handleSavePere = async () => {
    if (!famille) return;
    try {
        console.log("Données à envoyer:", pereForm);

   const res = await fetch(`http://localhost:8080/api/famille/${famille.id}/pere`, {
     method: "PUT",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(pereForm),
     credentials: "include",
     mode: "cors" // 🔹 ajouté
   });


      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const updatedPere = await res.json();
      setFamille(prev => prev ? { ...prev, pere: updatedPere } : prev);
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour de la mère");
    }
  };
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [typesRes, habitationsRes] = await Promise.all([
          fetch("http://localhost:8080/api/famille/types"),
          fetch("http://localhost:8080/api/famille/habitations"),
        ]);
        const typesData = await typesRes.json();
        const habitationsData = await habitationsRes.json();

        setTypesFamilles([{ value: 0, label: "Aucun" }, ...typesData.map((t: any) => ({ value: t.id, label: t.nom }))]);
        setHabitations([{ value: 0, label: "Aucun" }, ...habitationsData.map((h: any) => ({ value: h.id, label: h.nom }))]);
        setLoadingOptions(false);
      } catch (err) {
        console.error("Erreur fetch options:", err);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    const fetchFamille = async () => {
      try {
        const urlParts = window.location.pathname.split("/").filter(Boolean);
        const id = Number(urlParts[urlParts.length - 1]);
        if (isNaN(id)) return;

        const res = await fetch(`http://localhost:8080/api/famille/${id}`);
        const data: Famille = await res.json();
        setFamille(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFamille();
  }, []);

  useEffect(() => {
    if (famille && typesFamilles.length > 0 && habitations.length > 0) {
      if (famille.typeFamille && famille.typeFamille.id !== 0 && !typesFamilles.some(t => t.value === famille.typeFamille.id)) {
        setTypesFamilles(prev => [...prev, { value: famille.typeFamille.id, label: famille.typeFamille.nom }]);
      }
      if (famille.habitationFamille && famille.habitationFamille.id !== 0 && !habitations.some(h => h.value === famille.habitationFamille.id)) {
        setHabitations(prev => [...prev, { value: famille.habitationFamille.id, label: famille.habitationFamille.nom }]);
      }

      setFormData({
        typeFamilleId: famille.typeFamille?.id || 0,
        habitationFamilleId: famille.habitationFamille?.id || 0,
        adresseFamille: famille.adresseFamille || "",
        phone: famille.phone || "",
        dateInscription: famille.dateInscription || "",
        possedeMalade: famille.possedeMalade || false,
        personneMalade: famille.personneMalade || "",
      });
    }
  }, [famille, typesFamilles, habitations]);

  const openModal = (type: "العائلة" | "Mere" | "Pere"| "Enfant", enfant?: Enfant ) => {
    setModalType(type);
    if (enfant) setCurrentEnfant(enfant);
  };
  const closeModal = () => {
    setModalType(null);
    if (modalType === "Mere") setMereFormLoaded(false);
      if (modalType === "Pere") setPereFormLoaded(false);

  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

const handleSaveEnfant = async () => {
  if (!famille) return;

  try {
    // Construire le payload JSON
    const payload = {
      prenom: enfantForm.prenom || "",
      nom: enfantForm.nom || "",
      dateNaissance: enfantForm.dateNaissance || "",
      estMalade: enfantForm.estMalade || false,
      typeMaladie: enfantForm.typeMaladie || "",
      niveauScolaireId: enfantForm.niveauscolaireId || null,
      photoEnfantBase64: enfantForm.photoEnfant || null, // Base64
    };

    console.log("Payload JSON à envoyer :", payload);

    const response = await fetch(
      `http://localhost:8080/api/enfant/${enfantForm.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // si backend utilise session
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

    const updatedEnfant = await response.json();
    console.log("Enfant mis à jour :", updatedEnfant);

    // Mise à jour du state famille
    setFamille((prev) =>
      prev
        ? {
            ...prev,
            enfants:
              prev.enfants?.map((e) =>
                e.id === updatedEnfant.id ? updatedEnfant : e
              ) || [],
          }
        : prev
    );

    closeModal();
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'enfant :", error);
    alert("Erreur lors de la mise à jour de l'enfant");
  }
};


  const handleSave = async () => {
    if (!famille) return;

    const selectedTypeFamille = typesFamilles.find(t => t.value.toString() === formData.typeFamilleId.toString()) || null;
    const selectedHabitation = habitations.find(h => h.value.toString() === formData.habitationFamilleId.toString()) || null;

    try {
      const updatedData = {
        typeFamille: selectedTypeFamille
          ? { id: Number(selectedTypeFamille.value), nom: selectedTypeFamille.label }
          : null,
        habitationFamille: selectedHabitation
          ? { id: Number(selectedHabitation.value), nom: selectedHabitation.label }
          : null,
        adresseFamille: formData.adresseFamille,
        phone: formData.phone,
        dateInscription: formData.dateInscription,
        possedeMalade: formData.possedeMalade,
        personneMalade: formData.personneMalade,
      };

      const res = await fetch(`http://localhost:8080/api/famille/${famille.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
        mode: "cors",
        credentials: "include"
      });

      const text = await res.text(); // lire le texte pour debug
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}: ${text}`);

      const updatedFamille = JSON.parse(text);
      setFamille(updatedFamille);
      setFormData({
        typeFamilleId: updatedFamille.typeFamille?.id || 0,
        habitationFamilleId: updatedFamille.habitationFamille?.id || 0,
        adresseFamille: updatedFamille.adresseFamille || "",
        phone: updatedFamille.phone || "",
        dateInscription: updatedFamille.dateInscription || "",
        possedeMalade: updatedFamille.possedeMalade || false,
        personneMalade: updatedFamille.personneMalade || "",
      });

    } catch (err: any) {
      console.error("Erreur fetch PUT:", err);
      alert(`Erreur réseau ou serveur: ${err.message}`);
    }

    closeModal();
  };
  const [showPdf, setShowPdf] = useState(false);
   const pdfRef = useRef<HTMLDivElement>(null);
  if (!famille || loadingOptions) return <p>Chargement...</p>;
 // TOUJOURS déclaré ici

const handleExportPDF = async () => {
  if (!pdfRef.current) return;

  const canvas = await html2canvas(pdfRef.current, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("famille.pdf");
}; // <-- Bien fermer la fonction


  const renderModalContent = () => {
    if (modalType === "العائلة") {
      return (
        <>
          <h4 dir="rtl" className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            تعديل معلومات العائلة
          </h4>
          <form dir="rtl" className="flex flex-col">
            <div className="px-2 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div>
                  <Label>نوع الحالة</Label>
                  <Select
                    options={typesFamilles}
                    value={formData.typeFamilleId}
                    onChange={(val: number) => setFormData(prev => ({ ...prev, typeFamilleId: val }))}
                    placeholder="نوع الحالة"
                    apiUrl="http://localhost:8080/api/famille/types"
                    onNewItem={(newOpt) => console.log("New type added:", newOpt)}
                  />
                </div>

                <div>
                  <Label>نوع السكن</Label>
                  <Select
                    options={habitations}
                    value={formData.habitationFamilleId}
                    onChange={(val: number) => setFormData(prev => ({ ...prev, habitationFamilleId: val }))}
                    placeholder="نوع السكن"
                    apiUrl="http://localhost:8080/api/famille/habitations"
                    onNewItem={(newOpt) => console.log("New habitation added:", newOpt)}
                  />
                </div>

                <div>
                  <Label>العنوان</Label>
                  <Input type="text" name="adresseFamille" value={formData.adresseFamille} onChange={handleChange} />
                </div>

                <div>
                  <Label>الهاتف</Label>
                  <Input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                </div>

                <div>
                  <Label>date inscription</Label>
                  <Input
                    type="text"
                    name="dateInscription"
                    placeholder="__/__/____"
                    value={formData.dateInscription}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                      if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
                      if (val.length > 10) val = val.slice(0, 10);
                      setFormData(prev => ({ ...prev, dateInscription: val }));
                    }}
                  />
                </div>

                <div>
                  <input
                    type="checkbox"
                    checked={formData.possedeMalade}
                    onChange={(e) => setFormData(prev => ({ ...prev, possedeMalade: e.target.checked, personneMalade: e.target.checked ? prev.personneMalade : "" }))}
                    className="mr-2"
                  />
                  <label>هل تعتني بشخص مريض في المنزل?</label>
                </div>

                <div>
                  <Label>صلة القرابة</Label>
                  <Input
                    type="text"
                    name="personneMalade"
                    value={formData.personneMalade}
                    onChange={handleChange}
                    disabled={!formData.possedeMalade}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>Close</Button>
                           <button size="sm" variant="outline" type="button" onClick={handleSave}>Save</button>
                         </div>
                       </form>
                     </>
                   );
                 }
if (modalType === "Mere") {
  return (
    <>
      <h4 dir="rtl" className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
        تعديل معلومات الام
      </h4>
      <form dir="rtl" className="flex flex-col">
        <div className="px-2 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">

            {/* Image de la mère */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <Label>صورة الام</Label>
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100 cursor-pointer group"
                onClick={handlePhotoClick}
              >
                {mereForm.photoMere ? (
                  <img
                    src={`data:image/jpeg;base64,${mereForm.photoMere}`}
                    alt="Photo Mère"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Cliquer pour ajouter</span>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-semibold">Modifier</span>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            {/* Checkbox décédée */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="estDecedee"
                checked={mereForm.estDecedee}
                onChange={handleMereChange}
              />
              <Label>هل الام متوفاة?</Label>
            </div>

            {/* Si décédée : afficher seulement nom, prénom, date de décès */}
            {mereForm.estDecedee ? (
              <>
                <div className="flex flex-col">
                  <Label>الاسم</Label>
                  <Input type="text" name="nom" value={mereForm.nom} onChange={handleMereChange} />
                </div>

                <div className="flex flex-col">
                  <Label>النسب</Label>
                  <Input type="text" name="prenom" value={mereForm.prenom} onChange={handleMereChange} />
                </div>

                <div className="flex flex-col">
                  <Label>تاريخ الوفاة</Label>
                  <Input type="date" name="dateDeces" value={mereForm.dateDeces} onChange={handleMereChange} />
                </div>
              </>
            ) : (
              // Sinon : afficher tous les champs habituels
              <>
                <div className="flex flex-col">
                  <Label>الاسم</Label>
                  <Input type="text" name="nom" value={mereForm.nom} onChange={handleMereChange} />
                </div>

                <div className="flex flex-col">
                  <Label>النسب</Label>
                  <Input type="text" name="prenom" value={mereForm.prenom} onChange={handleMereChange} />
                </div>

                <div className="flex flex-col">
                  <Label>الهاتف</Label>
                  <Input type="text" name="phone" value={mereForm.phone} onChange={handleMereChange} />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" name="estMalade" checked={mereForm.estMalade} onChange={handleMereChange} />
                  <Label>هل الام مريصة?</Label>
                </div>

                <div className="flex flex-col">
                  <Label>نوع المرض</Label>
                  <Input
                    type="text"
                    name="typeMaladie"
                    value={mereForm.typeMaladie}
                    onChange={handleMereChange}
                    disabled={!mereForm.estMalade}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" name="estTravaille" checked={mereForm.estTravaille} onChange={handleMereChange} />
                  <Label>هل الام تعمل?</Label>
                </div>

                <div className="flex flex-col">
                  <Label>نوع العمل</Label>
                  <Input
                    type="text"
                    name="typeTravail"
                    value={mereForm.typeTravail}
                    onChange={handleMereChange}
                    disabled={!mereForm.estTravaille}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
          <Button size="sm" variant="outline" onClick={closeModal}>Close</Button>
          <button size="sm" variant="outline" type="button" onClick={handleSaveMere}>Save</button>
        </div>
      </form>
    </>
  );
}
if (modalType === "Pere") {
  return (
    <>
      <h4 dir="rtl" className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
        تعديل معلومات الاب
      </h4>
      <form dir="rtl" className="flex flex-col">
        <div className="px-2 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">

            {/* Image de la mère */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <Label>صورة الاب</Label>
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100 cursor-pointer group"
                onClick={handlePhotoClick}
              >
                {pereForm.photoPere ? (
                  <img
                    src={`data:image/jpeg;base64,${pereForm.photoPere}`}
                    alt="Photo Mère"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Cliquer pour ajouter</span>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-semibold">Modifier</span>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoChangePere}
                className="hidden"
              />
            </div>

            {/* Checkbox décédée */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="estDecedee"
                checked={pereForm.estDecedee}
                onChange={handlePereChange}
              />
              <Label>هل الاب متوفي?</Label>
            </div>

            {/* Si décédée : afficher seulement nom, prénom, date de décès */}
            {pereForm.estDecedee ? (
              <>
                <div className="flex flex-col">
                  <Label>الاسم</Label>
                  <Input type="text" name="nom" value={pereForm.nom} onChange={handlePereChange} />
                </div>

                <div className="flex flex-col">
                  <Label>النسب</Label>
                  <Input type="text" name="prenom" value={pereForm.prenom} onChange={handlePereChange} />
                </div>

                <div className="flex flex-col">
                  <Label>تاريخ الوفاة</Label>
                  <Input type="date" name="dateDeces" value={pereForm.dateDeces} onChange={handlePereChange} />
                </div>
              </>
            ) : (
              // Sinon : afficher tous les champs habituels
              <>
                <div className="flex flex-col">
                  <Label>الاسم</Label>
                  <Input type="text" name="nom" value={pereForm.nom} onChange={handlePereChange} />
                </div>

                <div className="flex flex-col">
                  <Label>النسب</Label>
                  <Input type="text" name="prenom" value={pereForm.prenom} onChange={handlePereChange} />
                </div>

                <div className="flex flex-col">
                  <Label>الهاتف</Label>
                  <Input type="text" name="phone" value={pereForm.phone} onChange={handlePereChange} />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" name="estMalade" checked={pereForm.estMalade} onChange={handlePereChange} />
                  <Label>هل الام مريصة?</Label>
                </div>

                <div className="flex flex-col">
                  <Label>نوع المرض</Label>
                  <Input
                    type="text"
                    name="typeMaladie"
                    value={pereForm.typeMaladie}
                    onChange={handlePereChange}
                    disabled={!pereForm.estMalade}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" name="estTravaille" checked={pereForm.estTravaille} onChange={handlePereChange} />
                  <Label>هل الام تعمل?</Label>
                </div>

                <div className="flex flex-col">
                  <Label>نوع العمل</Label>
                  <Input
                    type="text"
                    name="typeTravail"
                    value={pereForm.typeTravail}
                    onChange={handlePereChange}
                    disabled={!pereForm.estTravaille}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
          <Button size="sm" variant="outline" onClick={closeModal}>Close</Button>
          <button size="sm" variant="outline" type="button" onClick={handleSavePere}>Save</button>
        </div>
      </form>
    </>
  );
}
if (modalType === "Enfant" && currentEnfant) {
   return (
     <>
       <h4 dir="rtl" className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
         تعديل معلومات الطفل
       </h4>

       <form dir="rtl" className="flex flex-col">
         <div className="px-2 overflow-y-auto custom-scrollbar">
           <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
  <div className="flex flex-col items-center gap-2 mb-4">
              <Label>صورة الام</Label>
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100 cursor-pointer group"
                onClick={handlePhotoClick}
              >
                {enfantForm.photoEnfant ? (
                  <img
                    src={`data:image/jpeg;base64,${enfantForm.photoEnfant}`}
                    alt="Photo Mère"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Cliquer pour ajouter</span>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-semibold">Modifier</span>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoChangeEnfant}
                className="hidden"
              />
            </div>

             <div>
               <Label>الاسم</Label>
               <Input
                 type="text"
                 name="nom"
                 value={enfantForm.nom}
                 onChange={(e) => setEnfantForm(prev => ({ ...prev, nom: e.target.value }))}
               />
             </div>

             <div>
               <Label>اللقب</Label>
               <Input
                 type="text"
                 name="prenom"
                 value={enfantForm.prenom}
                 onChange={(e) => setEnfantForm(prev => ({ ...prev, prenom: e.target.value }))}
               />
             </div>

             <div>
               <Label>تاريخ الازدياد</Label>
               <Input
                 type="text"
                 name="dateNaissance"
                 placeholder="__/__/____"
                 value={enfantForm.dateNaissance}
                 onChange={(e) => setEnfantForm(prev => ({ ...prev, dateNaissance: e.target.value }))}
               />
             </div>

             <div>
               <Label>هل الطفل مريض؟</Label>
               <input
                 type="checkbox"
                 checked={enfantForm.estMalade}
                 onChange={(e) =>
                   setEnfantForm(prev => ({ ...prev, estMalade: e.target.checked, typeMaladie: e.target.checked ? prev.typeMaladie : "" }))
                 }
                 className="mr-2"
               />
             </div>

             {enfantForm.estMalade && (
               <div>
                 <Label>نوع المرض</Label>
                 <Input
                   type="text"
                   name="typeMaladie"
                   value={enfantForm.typeMaladie}
                   onChange={(e) => setEnfantForm(prev => ({ ...prev, typeMaladie: e.target.value }))}
                 />
               </div>
             )}

             <div>
               <Label>المستوى الدراسي</Label>
               <Select
                 options={niveauxScolaires}
                 value={enfantForm.niveauscolaireId}
                 onChange={(val: number) => setEnfantForm(prev => ({ ...prev, niveauscolaireId: val }))}
                 placeholder="Sélectionnez le niveau scolaire"
               />
             </div>

           </div>
         </div>

         <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
           <Button size="sm" variant="outline" onClick={closeModal}>Close</Button>
           <button size="sm" variant="outline" type="button" onClick={handleSaveEnfant}>Save</button>
         </div>
       </form>
     </>
   );
 }

                 return null;
                };



  return (
    <>
      <PageMeta
        title="React.js Profile Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Profile" />
      <div ref={pdfRef} dir="rtl" className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                      <div className="flex gap-4">
                           {famille.pere?.photoPere && (
                             <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100">
                               <img
                                 src={`data:image/jpeg;base64,${famille.pere.photoPere}`}
                                 alt="Père"
                                 className="w-full h-full object-cover"
                               />
                             </div>
                           )}

                           {/* Image de la mère */}
                       {famille.mere?.photoMere && (
                         <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100">
                           <img
                             src={`data:image/jpeg;base64,${famille.mere.photoMere}`}
                             alt="Père"
                             className="w-full h-full object-cover"
                           />
                         </div>
                       )}
{/* Images des enfants */}
{famille.enfants &&
  famille.enfants
    .filter((enfant) => enfant.photoEnfant) // 👈 garde seulement ceux qui ont une photo
    .map((enfant, index) => (
      <div
        key={index}
        className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100"
      >
        <img
          src={`data:image/jpeg;base64,${enfant.photoEnfant}`}
          alt={enfant.prenom}
          className="w-full h-full object-cover"
        />
      </div>
    ))}


                         </div>
                      <div className="order-3 xl:order-2">
                        <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                         عائلة {famille.pere ? `${famille.pere.nom} ` : "N/A"}
                        </h4>
                        <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                           {famille.typeFamille ? `${famille.typeFamille.nom} ` : "N/A"}
                          </p>
                          <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                      {famille.adresseFamille ? `${famille.adresseFamille}` : "N/A"}

                          </p>
                        </div>
                      </div>

                    </div>
                    <button

              onClick={() => openModal("العائلة")}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                    >
                      <svg
                        className="fill-current"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                          fill=""
                        />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>


       <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">


               <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                 معلومات الام
               </h4>
 <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
  {famille.mere?.photoMere && (
                                                          <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100">
                                                            <img
                                                              src={`data:image/jpeg;base64,${famille.mere.photoMere}`}
                                                              alt="Père"
                                                              className="w-full h-full object-cover"
                                                            />
                                                          </div>
                                                        )}
             <div>
               <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-7 2xl:gap-x-32">
                 {famille.mere ? (
                   famille.mere.estDecedee ? (
                     // Cas mère décédée : n'afficher que nom et date de décès
                     <>
                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">الاسم الكامل</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {`${famille.mere.nom} ${famille.mere.prenom}`}
                         </p>
                       </div>
                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">تاريخ الوفاة</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.mere.dateDeces || "غير محدد"}
                         </p>
                       </div>
                     </>
                   ) : (
                     // Cas mère vivante : afficher tous les autres champs
                     <>
                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">الاسم الكامل</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {`${famille.mere.nom} ${famille.mere.prenom}`}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">الهاتف</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.mere.phone || "غير محدد"}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">رقم البطاقة الوطنية</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.mere.cin || "غير محدد"}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">تاريخ الازدياد</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.mere.dateNaissance || "غير محدد"}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">مكان الازدياد</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.mere.villeNaissance || "غير محدد"}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">هل الام مريصة?</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.mere.estMalade ? "نعم" : "لا"}
                         </p>
                       </div>
                       {famille.mere.estMalade && (
                         <div>
                           <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">نوع المرض</p>
                           <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                             {famille.mere.typeMaladie || "غير محدد"}
                           </p>
                         </div>
                       )}

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">هل الام تعمل?</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.mere.estTravaille ? "نعم" : "لا"}
                         </p>
                       </div>
                       {famille.mere.estTravaille && (
                         <div>
                           <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">نوع العمل</p>
                           <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                             {famille.mere.typeTravail || "غير محدد"}
                           </p>
                         </div>
                       )}
                     </>
                   )
                 ) : (
                   <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full">لا توجد معلومات</p>
                 )}
               </div>
             </div>

             <button

                          onClick={() => openModal("Mere")}
                                  className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                                >
                <svg
                  className="fill-current"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                    fill=""
                  />
                </svg>
                Edit
              </button>
            </div>


          </div>

       <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">


               <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                 معلومات الاب
               </h4>
 <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
  {famille.pere?.photoPere && (
                                                          <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100">
                                                            <img
                                                              src={`data:image/jpeg;base64,${famille.pere.photoPere}`}
                                                              alt="Père"
                                                              className="w-full h-full object-cover"
                                                            />
                                                          </div>
                                                        )}
             <div>
               <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-7 2xl:gap-x-32">
                 {famille.pere ? (
                   famille.pere.estDecedee ? (
                     // Cas mère décédée : n'afficher que nom et date de décès
                     <>
                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">الاسم الكامل</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {`${famille.pere.nom} ${famille.pere.prenom}`}
                         </p>
                       </div>
                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">تاريخ الوفاة</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.pere.dateDeces || "غير محدد"}
                         </p>
                       </div>
                     </>
                   ) : (
                     // Cas mère vivante : afficher tous les autres champs
                     <>
                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">الاسم الكامل</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {`${famille.pere.nom} ${famille.pere.prenom}`}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">الهاتف</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.pere.phone || "غير محدد"}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">رقم البطاقة الوطنية</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.pere.cin || "غير محدد"}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">تاريخ الازدياد</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.pere.dateNaissance || "غير محدد"}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">مكان الازدياد</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.pere.villeNaissance || "غير محدد"}
                         </p>
                       </div>

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">هل الام مريصة?</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.pere.estMalade ? "نعم" : "لا"}
                         </p>
                       </div>
                       {famille.pere.estMalade && (
                         <div>
                           <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">نوع المرض</p>
                           <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                             {famille.pere.typeMaladie || "غير محدد"}
                           </p>
                         </div>
                       )}

                       <div>
                         <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">هل الام تعمل?</p>
                         <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                           {famille.pere.estTravaille ? "نعم" : "لا"}
                         </p>
                       </div>
                       {famille.pere.estTravaille && (
                         <div>
                           <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">نوع العمل</p>
                           <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                             {famille.pere.typeTravail || "غير محدد"}
                           </p>
                         </div>
                       )}
                     </>
                   )
                 ) : (
                   <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full">لا توجد معلومات</p>
                 )}
               </div>
             </div>
<button

                          onClick={() => openModal("Pere")}
                                  className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                                >
                <svg
                  className="fill-current"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                    fill=""
                  />
                </svg>
                Edit
              </button>

            </div>


          </div>
       <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
         <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
           معلومات الأطفال
         </h4>

         <div className="flex flex-col gap-6">
           {famille.enfants && famille.enfants.length > 0 ? (
             famille.enfants.map((enfant: Enfant) => (
               <div
                 key={enfant.id}
                 className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
               >
                 {/* Photo de l'enfant */}
                 {enfant.photoEnfant && (
                   <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100">
                     <img
                       src={`data:image/jpeg;base64,${enfant.photoEnfant}`}
                       alt={`${enfant.prenom} ${enfant.nom}`}
                       className="w-full h-full object-cover"
                     />
                   </div>
                 )}

                 {/* Infos de l'enfant */}
                 <div className="grid grid-cols-2 gap-4 lg:grid-cols-6 lg:gap-7 2xl:gap-x-32">
                   <div>
                     <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">الاسم الكامل</p>
                     <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                       {`${enfant.nom} ${enfant.prenom}`}
                     </p>
                   </div>

                   <div>
                     <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">تاريخ الازدياد</p>
                     <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                       {enfant.dateNaissance || "غير محدد"}
                     </p>
                   </div>

                   <div>
                     <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">المستوى الدراسي</p>
                     <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                       {enfant.niveauscolaire?.nom || "غير محدد"}
                     </p>
                   </div>

                   <div>
                     <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">هل الطفل مريض؟</p>
                     <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                       {enfant.estMalade ? "نعم" : "لا"}
                     </p>
                   </div>

                   {enfant.estMalade && (
                     <div>
                       <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">نوع المرض</p>
                       <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                         {enfant.typeMaladie || "غير محدد"}
                       </p>
                     </div>
                   )}
  </div>
                   {/* Bouton pour éditer l'enfant */}
                   <button

                                            onClick={() => openModal("Enfant",enfant)}
                                                    className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                                                  >
                                  <svg
                                    className="fill-current"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 18 18"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                                      fill=""
                                    />
                                  </svg>
                                  Edit
                                </button>

               </div>
             ))

           ) : (
             <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد معلومات عن الأطفال</p>

           )}
         </div>

       </div>

 <button
             onClick={handleExportPDF}
             className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
           >
             Exporter en PDF
           </button>


             </div>

        </div>

      <Modal isOpen={modalType !== null} onClose={closeModal} className="max-w-[700px] m-4">
              <div className="no-scrollbar w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                {renderModalContent()}
              </div>
            </Modal>

    </>

  );
}
