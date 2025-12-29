import { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { FaCheck, FaTimes } from "react-icons/fa";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import DropzoneComponent from "../../components/form/form-elements/DropZone";

interface Option {
  value: string | number;
  label: string;
}
interface Enfant {
  nom: string;
  prenom: string;
  dateNaissance: string;
  niveauscolaire: { id: string | number } | null;
  ecole: { id: string | number } | null;
  photoEnfant: File | null;
  typeMaladie: string;
  estMalade: boolean;
}

export default function FormElements() {
  const [familleData, setFamilleData] = useState({
    typeFamille: null as { id: string | number } | null,
    habitationFamille: null as { id: string | number } | null,
    adresseFamille: "",
    nombreEnfants: 0,
    phone: "",
    dateInscription: "",
    personneMalade: "",
    possedeMalade: false,
  });

  const [mereData, setMereData] = useState({
    nom: "",
    prenom: "",
    cin: "",
    phone: "",
    villeNaissance: "",
    dateNaissance: "",
    dateDeces: "",
    typeMaladie: "",
    typeTravail: "",
    estDecedee: false,
    estMalade: false,
    estTravaille: false,
    photoMere: null as File | null,
  });

  const [pereData, setPereData] = useState({
    nom: "",
    prenom: "",
    cin: "",
    phone: "",
    villeNaissance: "",
    dateNaissance: "",
    dateDeces: "",
    typeMaladie: "",
    typeTravail: "",
    estDecedee: false,
    estMalade: false,
    estTravaille: false,
    photoPere: null as File | null,
  });

  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [niveauxscolaires, setNiveauxscolaires] = useState<Option[]>([]);
  const [ecoles, setEcoles] = useState<Option[]>([]);

  const [typesFamille, setTypesFamille] = useState<Option[]>([]);
  const [habitations, setHabitations] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target) return reject("Erreur lecture fichier");
        img.src = e.target.result as string;
      };
      reader.readAsDataURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Erreur canvas");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = (err) => reject(err);
    });
  };

  // Fetch listes initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesRes, habitationsRes, niveauxRes, ecolesRes] = await Promise.all([
          fetch("http://localhost:8080/api/famille/types"),
          fetch("http://localhost:8080/api/famille/habitations"),
          fetch("http://localhost:8080/api/enfant/niveauScolaire"),
          fetch("http://localhost:8080/api/enfant/ecole")
        ]);

        const ecolesData = await ecolesRes.json();
        setEcoles(ecolesData.map((e: any) => ({ value: e.id, label: e.nom })));

        const typesData = await typesRes.json();
        setTypesFamille(typesData.map((t: any) => ({ value: t.id, label: t.nom })));

        const habitationsData = await habitationsRes.json();
        setHabitations(habitationsData.map((h: any) => ({ value: h.id, label: h.nom })));

        const niveauxData = await niveauxRes.json();
        setNiveauxscolaires(niveauxData.map((n: any) => ({ value: n.id, label: n.nom })));
      } catch (error) {
        console.error("Erreur lors du fetch des listes :", error);
      }
    };
    fetchData();
  }, []);

  // Mise à jour automatique du tableau enfants
  useEffect(() => {
    const n = familleData.nombreEnfants || 0;
    setEnfants((prev) => {
      const updated = [...prev];
      if (n > prev.length) {
        for (let i = prev.length; i < n; i++) {
          updated.push({
            nom: "",
            prenom: "",
            dateNaissance: "",
            niveauscolaire: null,
            ecole: null,
            photoEnfant: null,
            typeMaladie: "",
            estMalade: false
          });
        }
      } else {
        updated.length = n;
      }
      return updated;
    });
  }, [familleData.nombreEnfants]);

  // Gestion date format jj/mm/aaaa
  const formatDateInput = (val: string) => {
    val = val.replace(/\D/g, "");
    if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
    return val.slice(0, 10);
  };

 const convertDate = (dateStr: string): string => {
   if (!dateStr) return '';

   // Si déjà au format yyyy-MM-dd (HTML input), on renvoie tel quel
   if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

   // Supprime tout sauf chiffres (pour dd/MM/yyyy)
   const clean = dateStr.replace(/\D/g, '');
   if (clean.length !== 8) return '';

   const dd = clean.slice(0, 2);
   const mm = clean.slice(2, 4);
   const yyyy = clean.slice(4, 8);

   const day = parseInt(dd, 10);
   const month = parseInt(mm, 10);
   const year = parseInt(yyyy, 10);

   if (
     isNaN(day) || day < 1 || day > 31 ||
     isNaN(month) || month < 1 || month > 12 ||
     isNaN(year) || year < 1900 || year > 2100
   ) {
     return '';
   }

   return `${yyyy}-${mm}-${dd}`;
 };
// Conversion des dates mère et père
const mereDataConverted = {
  ...mereData,
  dateNaissance: convertDate(mereData.dateNaissance),
  dateDeces: convertDate(mereData.dateDeces),
};

const pereDataConverted = {
  ...pereData,
  dateNaissance: convertDate(pereData.dateNaissance),
  dateDeces: convertDate(pereData.dateDeces),
};

// Conversion des dates des enfants
const enfantsConverted = enfants.map((enfant) => ({
  ...enfant,
  dateNaissance: convertDate(enfant.dateNaissance),

}));

 const handleSubmitAll = async () => {
     setLoading(true);
     try {
       // 🔹 Validation famille
       if (!familleData.typeFamille || !familleData.habitationFamille || !familleData.adresseFamille || !familleData.phone) {
         throw new Error("Certains champs de la famille sont manquants.");
       }

       // 🔹 Validation mère
       if (!mereData.nom || !mereData.prenom || (!mereData.estDecedee && (!mereData.cin || !mereData.phone))) {
         throw new Error("Certains champs de la mère sont manquants.");
       }

       // 🔹 Validation père
       if (!pereData.nom || !pereData.prenom || (!pereData.estDecedee && (!pereData.cin || !pereData.phone))) {
         throw new Error("Certains champs du père sont manquants.");
       }

       // 🔹 Conversion date inscription
       const convertedDateInscription = convertDate(familleData.dateInscription);
       if (!convertedDateInscription) throw new Error("La date d'inscription est invalide.");

       // 🔹 Création mère
       const formDataMere = new FormData();  // <-- Définition de formDataMere
     // FormData mère
     Object.entries(mereDataConverted).forEach(([key, value]) => {
       if (value !== null && key !== "photoMere") formDataMere.append(key, value.toString());
     });
     if (mereDataConverted.photoMere) formDataMere.append('photoMere', mereDataConverted.photoMere);

       // 🔹 Création père
       const formDataPere = new FormData();  // <-- Définition de formDataPere
      Object.entries(pereDataConverted).forEach(([key, value]) => {
        if (value !== null && key !== "photoPere") formDataPere.append(key, value.toString());
      });
      if (pereDataConverted.photoPere) formDataPere.append('photoPere', pereDataConverted.photoPere);

 console.log("Données mère à envoyer :");
           for (let pair of formDataMere.entries()) {
             console.log(pair[0], pair[1]);
           }
       // Avant le fetch père
       console.log("Données père à envoyer :");
       for (let pair of formDataPere.entries()) {
         console.log(pair[0], pair[1]);
       }
       const [responseMere, responsePere] = await Promise.all([

         fetch("http://localhost:8080/api/mere", { method: "POST", body: formDataMere }),
         fetch("http://localhost:8080/api/pere", { method: "POST", body: formDataPere })
       ]);
       if (!responseMere.ok) throw new Error("Erreur enregistrement mère");
       if (!responsePere.ok) throw new Error("Erreur enregistrement père");

       const savedMere = await responseMere.json();
       const savedPere = await responsePere.json();

       // 🔹 Préparer les études pour chaque enfant
     // 🔹 Préparer les études pour chaque enfant
     const etudesArray = enfantsConverted.map((enfant) => ({
       enfantId: enfant.id,
       ecoleId: enfant.ecole?.id,
       niveauScolaireId: enfant.niveauscolaire?.id,
       anneeScolaire: enfant.anneeScolaire, // maintenant au format yyyy-MM-dd
     }));


       // 🔹 Création famille
       const formDataFamille = new FormData();
       formDataFamille.append('adresseFamille', familleData.adresseFamille);
       formDataFamille.append('phone', familleData.phone);
       formDataFamille.append('dateInscription', convertedDateInscription);
       formDataFamille.append('possedeMalade', familleData.possedeMalade ? 'true' : 'false');
       formDataFamille.append('personneMalade', familleData.personneMalade || '');
       formDataFamille.append('typeFamilleId', familleData.typeFamille?.id.toString() || '');
       formDataFamille.append('habitationFamilleId', familleData.habitationFamille?.id.toString() || '');
       formDataFamille.append('mereId', savedMere.id.toString());
       formDataFamille.append('pereId', savedPere.id.toString());
      formDataFamille.append('enfantsJson', JSON.stringify(enfantsConverted));
       formDataFamille.append('etudesJson', JSON.stringify(etudesArray));

       // 🔹 Photos enfants
       enfants.forEach((enfant) => {
         if (enfant.photoEnfant) {
           formDataFamille.append('photoEnfant', enfant.photoEnfant);
         }
       });
console.log("Données famille à envoyer :");
for (let pair of formDataFamille.entries()) {
  console.log(pair[0], pair[1]);
}

       const responseFamille = await fetch("http://localhost:8080/api/famille", { method: "POST", body: formDataFamille });
       if (!responseFamille.ok) throw new Error("Erreur enregistrement famille");
       const savedFamille = await responseFamille.json();


// Pour voir aussi les enfants et études JSON
console.log("Enfants JSON : ", JSON.stringify(enfants, null, 2));
console.log("Études JSON : ", JSON.stringify(etudesArray, null, 2));
       // 🔹 Enregistrement des études en une seule requête


       alert("Toutes les données ont été enregistrées avec succès !");
       console.log("Famille enregistrée :", savedFamille);

     } catch (error: any) {
       console.error(error);
       alert("Erreur lors de l'enregistrement : " + error.message);
     } finally {
       setLoading(false);
     }
   };






  const Select = ({ options = [], value, onChange, placeholder, apiUrl, onNewItem }: any) => {
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newOption, setNewOption] = useState("");
    const [opts, setOpts] = useState(options);
    useEffect(() => setOpts(options), [options]);

    const handleSelect = (opt: Option) => {
      onChange(opt.value);
      setOpen(false);
    };

    const handleAddOption = async () => {
      if (!newOption.trim()) return;
      try {
        const res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: newOption }) });
        const savedItem = await res.json();
        const newOpt = { value: savedItem.id, label: savedItem.nom };
        setOpts((prev) => [...prev, newOpt]);
        if (onNewItem) onNewItem(newOpt);
        onChange(newOpt.value);
        setNewOption("");
        setAdding(false);
        setOpen(false);
      } catch (error) {
        console.error(error);
      }
    };

    return (
      <div className="relative w-full">
        <div
          className="border border-gray-300 rounded-lg px-4 py-2 cursor-pointer bg-white hover:bg-gray-50 transition duration-200 ease-in-out"
          onClick={() => setOpen(!open)}
        >
          {opts.find((o) => o.value === value)?.label || placeholder}
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full border border-gray-300 rounded-lg bg-white shadow-lg max-h-60 overflow-auto transition-all duration-300 ease-out">
            {opts.map((opt) => (
              <div
                key={opt.value}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition duration-150 ease-in-out"
                onClick={() => handleSelect(opt)}
              >
                {opt.label}
              </div>
            ))}

            {!adding ? (
              <div
                className="px-4 py-2 text-blue-600 cursor-pointer hover:bg-gray-100 transition duration-150 ease-in-out"
                onClick={() => setAdding(true)}
              >
                + Ajouter un élément
              </div>
            ) : (
              <div className="flex px-4 py-2 gap-2 items-center animate__animated animate__fadeIn animate__fast">
                <input
                  type="text"
                  placeholder="Nouvel élément"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  className="border p-2 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
                />
                <button
                  type="button"
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out"
                  onClick={handleAddOption}
                >
                  <FaCheck />
                </button>
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-300 text-black rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition duration-200 ease-in-out"
                  onClick={() => setAdding(false)}
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div dir="rtl">
      <PageMeta
        title="React.js Form Elements Dashboard"
        description="Formulaire famille et mère"
      />
      <PageBreadcrumb pageTitle="معلومات العائلة" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Formulaire Famille */}
        <div className="space-y-6">
          <ComponentCard title={<span className="font-bold">معلومات عامة</span>}>
            <div className="flex gap-4">
              <div className="w-1/2">
                <Select
                  options={typesFamille}
                  value={familleData.typeFamille?.id || ""}
                  onChange={(val) =>
                    setFamilleData({
                      ...familleData,
                      typeFamille: { id: val },
                    })
                  }
                  placeholder="نوع الحالة"
                  apiUrl="http://localhost:8080/api/famille/types"
                  onNewItem={(newOpt) => setTypesFamille((prev) => [...prev, newOpt])}
                />
              </div>
              <div className="w-1/2">
                <Select
                  options={habitations}
                  value={familleData.habitationFamille?.id || ""}
                  onChange={(val) =>
                    setFamilleData({
                      ...familleData,
                      habitationFamille: { id: val },
                    })
                  }
                  placeholder="نوع السكن"
                  apiUrl="http://localhost:8080/api/famille/habitations"
                  onNewItem={(newOpt) => setHabitations((prev) => [...prev, newOpt])}
                />
              </div>
            </div>

            <div className="md:col-span-2 mt-4">
              <Label htmlFor="adresseFamille">عنوان العائلة</Label>
              <Input
                type="text"
                placeholder="عنوان العائلة"
                value={familleData.adresseFamille}
                onChange={(e) => setFamilleData({ ...familleData, adresseFamille: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <div className="md:col-span-2 mt-4">
                  <Label htmlFor="nombreEnfants">عدد الأبناء</Label>
                  <Input
                    type="number"
                    placeholder="عدد الأبناء"
                    min={0}
                    value={familleData.nombreEnfants}
                    onChange={(e) => setFamilleData({ ...familleData, nombreEnfants: parseInt(e.target.value) })}
                    className="border p-2 rounded w-full"
                  />
                </div>
              </div>
              <div className="w-1/2">
                <div className="md:col-span-2 mt-4">
                  <Label htmlFor="numphone">رقم الهاتف</Label>
                  <Input
                    type="text"
                    placeholder="رقم الهاتف"

            value={familleData.phone}
            onChange={(e) => setFamilleData({ ...familleData, phone: e.target.value })}
            className="border p-2 rounded w-full"
          /></div></div></div>
             <div className="flex gap-4">
                <div className="w-1/2">
          <div className="flex flex-col md:col-span-2">
            <Label htmlFor="dateInscription">تاريخ التسجيل</Label>
           <Input
             type="text"
             id="dateInscription"
             placeholder="__/__/____"
             value={familleData.dateInscription}
             onChange={(e) => {
               let val = e.target.value.replace(/\D/g, ""); // Keep only digits
               if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
               if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
               if (val.length > 10) val = val.slice(0, 10);
               setFamilleData((prev) => ({ ...prev, dateInscription: val }));
             }}
           />
          </div></div></div>
  <div className="flex gap-4">
             <div className="w-1/2">
              <div className="flex items-center mt-4">
          <input
            type="checkbox"
            checked={familleData.possedeMalade}
            onChange={(e) => setFamilleData({ ...familleData, possedeMalade: e.target.checked })}
            className="mr-2"
          />
          <label>هل تعتني بشخص مريض في المنزل؟</label>
          </div></div>

             <div className="w-1/2">
        {familleData.possedeMalade && (
          <Input
            type="text"
            placeholder="نوع المرض"
            value={familleData.personneMalade}
            onChange={(e) => setFamilleData({ ...familleData, personneMalade: e.target.value })}
            className="border p-2 rounded w-full mt-2"
          />
        )}
        </div></div>


</ComponentCard>

 <ComponentCard title={<span className="font-bold">معلومات الأب</span>}>


    {/* Nom et Prénom toujours visibles */}
 {/* Checkbox Décédée */}
       <div className="flex gap-4">
          <div className="w-1/2">
    <div className="flex items-center mt-4">
      <input
        type="checkbox"
        checked={pereData.estDecedee}
        onChange={(e) => setPereData({ ...pereData, estDecedee: e.target.checked })}
        className="mr-2"
      />
      <label>هل الاب متوفي؟</label>
    </div>
   </div>

      <div className="w-1/2">
    {/* Si décédée, afficher seulement les champs essentiels */}
    {pereData.estDecedee && (
      <div className="mt-2 space-y-2">

  <Label htmlFor="nom">تاريخ الوفاة</Label>
  <Input
                        type="text"
                        id="datanaissancepere"
                        placeholder="__/__/____"
                       value={pereData.dateDeces}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, ""); // garder que les chiffres
                          if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                          if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
                          if (val.length > 10) val = val.slice(0, 10);
                          setPereData((prev) => ({ ...prev, dateDeces: val }));
                        }}
                      />


      </div>
    )}</div></div>
    <div className="flex gap-4">
     <div className="w-1/2">
            <Label htmlFor="prenom">الاسم</Label>
            <Input
              id="prenom"
              type="text"
              placeholder="الاسم"
              value={pereData.prenom}
              onChange={(e) => setPereData({ ...pereData, prenom: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>
      <div className="w-1/2">
        <Label htmlFor="nom">النسب</Label>
        <Input
          id="nom"
          type="text"
          placeholder="النسب"
          value={pereData.nom}
          onChange={(e) => setPereData({ ...pereData, nom: e.target.value })}
          className="border p-2 rounded w-full"
        />
      </div>


    </div>


    {/* Si non décédée, afficher les autres champs */}
    {!pereData.estDecedee && (
      <>
         <div className="flex gap-4">
            <div className="w-1/2">

             <Label htmlFor="nom">رقم البطاقة الوطنية</Label>
        <Input
          type="text"
          placeholder="CIN"
          value={pereData.cin}
          onChange={(e) => setPereData({ ...pereData, cin: e.target.value })}
          className="border p-2 rounded w-full"
        />
           </div>

              <div className="w-1/2">
                <Label htmlFor="nom">رقم الهاتف</Label>
         <Input
                  type="text"
                  placeholder="Téléphone"
                  value={pereData.phone}
                  onChange={(e) => setPereData({ ...pereData, phone: e.target.value })}
                  className="border p-2 rounded w-full"
                /></div></div>
   <div className="flex gap-4">
      <div className="w-1/2">
                    <Label htmlFor="dateInscription">تاريخ الازدياد</Label>
                    <Input
                      type="text"
                      id="datanaissancepere"
                      placeholder="__/__/____"
                      value={pereData.dateNaissance}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, ""); // garder que les chiffres
                        if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                        if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
                        if (val.length > 10) val = val.slice(0, 10);
                        setPereData((prev) => ({ ...prev, dateNaissance: val }));
                      }}
                    />

   </div>

      <div className="w-1/2">
              <Label htmlFor="villeNaissance">مكان الازدياد</Label>
              <Input type="text" id="villeNaissance" value={pereData.villeNaissance}   onChange={(e) => setPereData({ ...pereData, villeNaissance: e.target.value })} />
            </div></div>


        {/* Checkbox Malade */}
          <div className="flex gap-4">
             <div className="w-1/2">
              <div className="flex items-center mt-4">
          <input
            type="checkbox"
            checked={pereData.estMalade}
            onChange={(e) => setPereData({ ...pereData, estMalade: e.target.checked })}
            className="mr-2"
          />
          <label>هل الاب مريض؟</label>
          </div></div>

             <div className="w-1/2">
        {pereData.estMalade && (
          <Input
            type="text"
            placeholder="نوع المرض"
            value={pereData.typeMaladie}
            onChange={(e) => setPereData({ ...pereData, typeMaladie: e.target.value })}
            className="border p-2 rounded w-full mt-2"
          />
        )}
        </div></div>

        {/* Checkbox Travaille */}
           <div className="flex gap-4">
              <div className="w-1/2">
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            checked={pereData.estTravaille}
            onChange={(e) => setPereData({ ...pereData, estTravaille: e.target.checked })}
            className="mr-2"
          />
          <label>هل الاب يعمل؟</label>
        </div>   </div>

                    <div className="w-1/2">
        {pereData.estTravaille && (
          <Input
            type="text"
            placeholder="نوع العمل"
            value={pereData.typeTravail}
            onChange={(e) => setPereData({ ...pereData, typeTravail: e.target.value })}
            className="border p-2 rounded w-full mt-2"
          />
        )}</div></div>
      </>
    )}

{!pereData.estDecedee && (
  <div className="mt-4">
    <DropzoneComponent
      label="صورة الأب"
      id="photoPere"
      onFileSelect={(file) => {
        setPereData((prev) => ({ ...prev, photoPere: file }));
      }}
    />

  </div>
)}

  </ComponentCard>
</div>
 <div className="space-y-6">

 <ComponentCard title={<span className="font-bold">معلومات الأم</span>}>


    {/* Nom et Prénom toujours visibles */}
 {/* Checkbox Décédée */}
       <div className="flex gap-4">
          <div className="w-1/2">
    <div className="flex items-center mt-4">
      <input
        type="checkbox"
        checked={mereData.estDecedee}
        onChange={(e) => setMereData({ ...mereData, estDecedee: e.target.checked })}
        className="mr-2"
      />
      <label>هل الام متوفاة؟</label>
    </div>
   </div>

      <div className="w-1/2">
    {/* Si décédée, afficher seulement les champs essentiels */}
    {mereData.estDecedee && (
      <div className="mt-2 space-y-2">

  <Label htmlFor="nom">تاريخ الوفاة</Label>
  <Input
                        type="text"
                        id="datanaissancemere"
                        placeholder="__/__/____"
                       value={mereData.dateDeces}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, ""); // garder que les chiffres
                          if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                          if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
                          if (val.length > 10) val = val.slice(0, 10);
                          setMereData((prev) => ({ ...prev, dateDeces: val }));
                        }}
                      />


      </div>
    )}</div></div>
    <div className="flex gap-4">
     <div className="w-1/2">
            <Label htmlFor="prenom">الاسم</Label>
            <Input
              id="prenom"
              type="text"
              placeholder="الاسم"
              value={mereData.prenom}
              onChange={(e) => setMereData({ ...mereData, prenom: e.target.value })}
              className="border p-2 rounded w-full"
            />
          </div>
      <div className="w-1/2">
        <Label htmlFor="nom">النسب</Label>
        <Input
          id="nom"
          type="text"
          placeholder="النسب"
          value={mereData.nom}
          onChange={(e) => setMereData({ ...mereData, nom: e.target.value })}
          className="border p-2 rounded w-full"
        />
      </div>


    </div>


    {/* Si non décédée, afficher les autres champs */}
    {!mereData.estDecedee && (
      <>
         <div className="flex gap-4">
            <div className="w-1/2">

             <Label htmlFor="nom">رقم البطاقة الوطنية</Label>
        <Input
          type="text"
          placeholder="CIN"
          value={mereData.cin}
          onChange={(e) => setMereData({ ...mereData, cin: e.target.value })}
          className="border p-2 rounded w-full"
        />
           </div>

              <div className="w-1/2">
                <Label htmlFor="nom">رقم الهاتف</Label>
         <Input
                  type="text"
                  placeholder="Téléphone"
                  value={mereData.phone}
                  onChange={(e) => setMereData({ ...mereData, phone: e.target.value })}
                  className="border p-2 rounded w-full"
                /></div></div>
   <div className="flex gap-4">
      <div className="w-1/2">
                    <Label htmlFor="dateInscription">تاريخ الازدياد</Label>
                    <Input
                      type="text"
                      id="datanaissancemere"
                      placeholder="__/__/____"
                      value={mereData.dateNaissance}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, ""); // garder que les chiffres
                        if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                        if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
                        if (val.length > 10) val = val.slice(0, 10);
                        setMereData((prev) => ({ ...prev, dateNaissance: val }));
                      }}
                    />

   </div>

      <div className="w-1/2">
              <Label htmlFor="villeNaissance">مكان الازدياد</Label>
              <Input type="text" id="villeNaissance" value={mereData.villeNaissance}   onChange={(e) => setMereData({ ...mereData, villeNaissance: e.target.value })} />
            </div></div>


        {/* Checkbox Malade */}
          <div className="flex gap-4">
             <div className="w-1/2">
              <div className="flex items-center mt-4">
          <input
            type="checkbox"
            checked={mereData.estMalade}
            onChange={(e) => setMereData({ ...mereData, estMalade: e.target.checked })}
            className="mr-2"
          />
          <label>هل الام مريضة؟</label>
          </div></div>

             <div className="w-1/2">
        {mereData.estMalade && (
          <Input
            type="text"
            placeholder="نوع المرض"
            value={mereData.typeMaladie}
            onChange={(e) => setMereData({ ...mereData, typeMaladie: e.target.value })}
            className="border p-2 rounded w-full mt-2"
          />
        )}
        </div></div>

        {/* Checkbox Travaille */}
           <div className="flex gap-4">
              <div className="w-1/2">
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            checked={mereData.estTravaille}
            onChange={(e) => setMereData({ ...mereData, estTravaille: e.target.checked })}
            className="mr-2"
          />
          <label>هل الام تعمل؟</label>
        </div>   </div>

                    <div className="w-1/2">
        {mereData.estTravaille && (
          <Input
            type="text"
            placeholder="نوع العمل"
            value={mereData.typeTravail}
            onChange={(e) => setMereData({ ...mereData, typeTravail: e.target.value })}
            className="border p-2 rounded w-full mt-2"
          />
        )}</div></div>
         <div className="md:col-span-2 mt-4">
             <DropzoneComponent
               label="صورة الأم"
               id="photoMere"
               onFileSelect={(file) => {
                 // stocke le File réel
                 setMereData(prev => ({ ...prev, photoMere: file }));
                 console.log("✅ Fichier mère sélectionné :", file.name);
               }}
             />







    </div>
      </>
    )}


  </ComponentCard><ComponentCard title={<span className="font-bold">معلومات الأبناء</span>}>
                    {/* Si aucun enfant, ne rien afficher */}
                    {familleData.nombreEnfants > 0 ? (
                      <>
                        {Array.from({ length: familleData.nombreEnfants }, (_, index) => (
                          <div key={index} className="border rounded-xl p-4 mb-6 bg-gray-50">
                            <h2 className="text-xl font-semibold mb-4 text-center">
                              الابن {index + 1}
                            </h2>

                            {/* Nom et prénom */}
                            <div className="flex gap-4">
                              <div className="w-1/2">
                                <Label htmlFor={`prenom-${index}`}>الاسم</Label>
                                <Input
                                  id={`prenom-${index}`}
                                  type="text"
                                  placeholder="الاسم"
                                  value={enfants[index]?.prenom || ""}
                                  onChange={(e) => {
                                    const newEnfants = [...enfants];
                                    newEnfants[index] = { ...newEnfants[index], prenom: e.target.value };
                                    setEnfants(newEnfants);
                                  }}
                                  className="border p-2 rounded w-full"
                                />
                              </div>

                              <div className="w-1/2">
                                <Label htmlFor={`nom-${index}`}>النسب</Label>
                                <Input
                                  id={`nom-${index}`}
                                  type="text"
                                  placeholder="النسب"
                                  value={enfants[index]?.nom || ""}
                                  onChange={(e) => {
                                    const newEnfants = [...enfants];
                                    newEnfants[index] = { ...newEnfants[index], nom: e.target.value };
                                    setEnfants(newEnfants);
                                  }}
                                  className="border p-2 rounded w-full"
                                />
                              </div>
                            </div>

                            {/* Date de naissance et niveau scolaire */}
                            <div className="flex gap-4 mt-4">
                              <div className="w-1/2">
                                <Label htmlFor={`date-${index}`}>تاريخ الازدياد</Label>
                                <Input
                                  id={`date-${index}`}
                                  type="text"
                                  placeholder="__/__/____"
                                  value={enfants[index]?.dateNaissance || ""}
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, "");
                                    if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                                    if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
                                    if (val.length > 10) val = val.slice(0, 10);

                                    const newEnfants = [...enfants];
                                    newEnfants[index] = { ...newEnfants[index], dateNaissance: val };
                                    setEnfants(newEnfants);
                                  }}
                                />
                              </div>
<div className="w-1/2">
                                <Label htmlFor={`date-${index}`}>السنة الدراسية</Label>
                              <Input
                                id={`date-${index}`}
                                type="text"
                                placeholder="YYYY/YYYY"
                                value={enfants[index]?.anneeScolaire || ""}
                                onChange={(e) => {
                                  // Supprime tout sauf les chiffres
                                  let val = e.target.value.replace(/\D/g, "");

                                  // Limite à 8 chiffres max (4 pour chaque année)
                                  if (val.length > 8) val = val.slice(0, 8);

                                  // Insère le slash après les 4 premiers chiffres
                                  if (val.length > 4) val = val.slice(0, 4) + "/" + val.slice(4);

                                  // Met à jour l'état
                                  const newEnfants = [...enfants];
                                  newEnfants[index] = { ...newEnfants[index], anneeScolaire: val };
                                  setEnfants(newEnfants);
                                }}
                              />

                              </div>
                              <div className="w-1/2">
                                <Label htmlFor={`niveauscolaire-${index}`}>المستوى الدراسي</Label>
                                <Select
                                  options={niveauxscolaires}
                                  value={enfants[index]?.niveauscolaire?.id || ""}
                                  onChange={(val) => {
                                    const newEnfants = [...enfants];
                                    newEnfants[index] = { ...newEnfants[index], niveauscolaire: val ? { id: val } : null };
                                    setEnfants(newEnfants);
                                  }}
                                  placeholder="اختر المستوى الدراسي"
                                  apiUrl="http://localhost:8080/api/enfant/niveauScolaire"
                                  onNewItem={(newOpt) => setNiveauxscolaires((prev) => [...prev, newOpt])}
                                />
                              </div>
                               <div className="w-1/2">
                                                              <Label htmlFor={`ecole-${index}`}>المؤسسة</Label>
                                                             <Select
                                                               options={ecoles}
                                                               value={enfants[index]?.ecole?.id || ""}
                                                               onChange={(val) => {
                                                                 const newEnfants = [...enfants];
                                                                 newEnfants[index] = { ...newEnfants[index], ecole: { id: val } };
                                                                 setEnfants(newEnfants);
                                                               }}
                                                               placeholder="اختر المؤسسة"
                                                               apiUrl="http://localhost:8080/api/enfant/ecole"
                                                               onNewItem={(newOpt) => setEcoles((prev) => [...prev, newOpt])}
                                                             />

                                                            </div>
                            </div>

                            {/* Checkbox Malade */}
                            <div className="flex gap-4 mt-4">
                              <div className="w-1/2 flex items-center">
                                <input
                                  type="checkbox"
                                  checked={enfants[index]?.estMalade || false}
                                  onChange={(e) => {
                                    const newEnfants = [...enfants];
                                    newEnfants[index] = {
                                      ...newEnfants[index],
                                      estMalade: e.target.checked,
                                    };
                                    setEnfants(newEnfants);
                                  }}
                                  className="mr-2"
                                />
                                <label>هل الابن مريض؟</label>
                              </div>

                              <div className="w-1/2">
                                {enfants[index]?.estMalade && (
                                  <Input
                                    type="text"
                                    placeholder="نوع المرض"
                                    value={enfants[index]?.typeMaladie || ""}
                                    onChange={(e) => {
                                      const newEnfants = [...enfants];
                                      newEnfants[index] = {
                                        ...newEnfants[index],
                                        typeMaladie: e.target.value,
                                      };
                                      setEnfants(newEnfants);
                                    }}
                                    className="border p-2 rounded w-full mt-2"
                                  />
                                )}
                              </div>
                            </div>

                            {/* Dropzone + aperçu */}
                            <div className="mt-6">
                             <DropzoneComponent
                                  label="Photo de l'enfant"
                                  id={`photoEnfant-${index}`}
                                  onFileSelect={(file) => {
                                    const updated = [...enfants];
                                    updated[index].photoEnfant = file; // <- c’est ici qu’on stocke le fichier
                                    setEnfants(updated);
                                    console.log(`✅ Fichier enfant ${index + 1} sélectionné :`, file.name);
                                  }}
                                />

                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-gray-500 text-center">لم يتم إدخال عدد الأبناء</p>
                    )}
                  </ComponentCard>



        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow-md transition"
          onClick={handleSubmitAll}
          disabled={loading}
        >
          {loading ? "Enregistrement..." : "💾 Enregistrer Tout"}
        </button>
      </div>
    </div>
  );
}
