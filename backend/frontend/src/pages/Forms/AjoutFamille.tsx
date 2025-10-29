import { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { FaCheck, FaTimes } from "react-icons/fa";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import DropzoneComponent from "../../components/form/form-elements/DropZone";
export default function FormElements() {
const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });


  const [familleData, setFamilleData] = useState({
    typeFamille: "",
    habitationFamille: "",
    adresseFamille: "",
    nombreEnfants: 0,
    phone: "",
    dateInscription: "",
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
    photoMere: null,
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
    photoPere: null,
  });

  const [enfants, setEnfants] = useState([]);
  const [niveauxscolaires, setNiveauxscolaires] = useState([]);
  const [typesFamille, setTypesFamille] = useState([]);
  const [habitations, setHabitations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch listes initiales
  useEffect(() => {
    fetch("http://localhost:8080/api/famille/types")
      .then((res) => res.json())
      .then((data) =>
        setTypesFamille(data.map((t) => ({ value: t.id, label: t.nom })))
      )
      .catch(console.error);

    fetch("http://localhost:8080/api/famille/habitations")
      .then((res) => res.json())
      .then((data) =>
        setHabitations(data.map((h) => ({ value: h.id, label: h.nom })))
      )
      .catch(console.error);

    fetch("http://localhost:8080/api/enfant/niveauScolaire")
      .then((res) => res.json())
      .then((data) =>
        setNiveauxscolaires(data.map((n) => ({ value: n.id, label: n.nom })))
      )
      .catch(console.error);
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
          });
        }
      } else if (n < prev.length) {
        updated.length = n;
      }
      return updated;
    });
  }, [familleData.nombreEnfants]);

  const handleSubmitAll = async () => {
    try {
      // 🔹 Envoi Mère
     if (!mereData.photoMere) {
          alert("⚠️ Veuillez sélectionner la photo de la mère");
          return;
        }

        // 🔹 Créer FormData pour la mère
        const formDataMere = new FormData();
        formDataMere.append("nom", mereData.nom);
        formDataMere.append("prenom", mereData.prenom);
        formDataMere.append("cin", mereData.cin);
        formDataMere.append("phone", mereData.phone);
        formDataMere.append("villeNaissance", mereData.villeNaissance);
        formDataMere.append("dateNaissance", mereData.dateNaissance);
        formDataMere.append("dateDeces", mereData.dateDeces);
        formDataMere.append("typeMaladie", mereData.typeMaladie);
        formDataMere.append("typeTravail", mereData.typeTravail);
        formDataMere.append("estDecedee", String(mereData.estDecedee));
        formDataMere.append("estMalade", String(mereData.estMalade));
        formDataMere.append("estTravaille", String(mereData.estTravaille));
        formDataMere.append("photoMere", mereData.photoMere); // 🔹 le File réel

        const responseMere = await fetch("http://localhost:8080/api/mere", {
          method: "POST",
          body: formDataMere,
          // ❌ Ne pas mettre Content-Type : fetch met automatiquement multipart/form-data
        });

        if (!responseMere.ok) throw new Error("Erreur lors de l’enregistrement de la mère");
        const savedMere = await responseMere.json();
        console.log("Mère enregistrée :", savedMere);

      // 🔹 Envoi Père
      const responsePere = await fetch("http://localhost:8080/api/pere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pereData),
      });

      if (!responsePere.ok) throw new Error("Erreur lors de l’enregistrement du père");
      const savedPere = await responsePere.json();

      // 🔹 Envoi Famille (avec références père/mère)
      const familleComplet = {
        ...familleData,
        mere: { id: savedMere.id },
        pere: { id: savedPere.id },
      };

      const responseFamille = await fetch("http://localhost:8080/api/famille", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familleComplet),
      });

      if (!responseFamille.ok) throw new Error("Erreur lors de l’enregistrement de la famille");
      const savedFamille = await responseFamille.json();

      // 🔹 Envoi Enfants
      for (const enfant of enfants) {
        const enfantComplet = {
          ...enfant,
          famille: { id: savedFamille.id },
          niveauscolaire: { id: enfant.niveauscolaire },
        };

        await fetch("http://localhost:8080/api/enfant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enfantComplet),
        });
      }

      alert("✅ Famille enregistrée avec succès !");
    } catch (error) {
      console.error("Erreur :", error);
      alert("❌ Une erreur est survenue : " + error.message);
    }
  };


  // 🔹 Composant Select générique
  const Select = ({ options = [], value, onChange, placeholder, apiUrl, onNewItem }) => {
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newOption, setNewOption] = useState("");
    const [opts, setOpts] = useState(options);

    useEffect(() => setOpts(options), [options]);

    const handleSelect = (opt) => {
      onChange(opt.value);
      setOpen(false);
    };

    const handleAddOption = async () => {
      if (!newOption.trim()) return;
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom: newOption }),
        });
        const savedItem = await response.json();
        const newOpt = { value: savedItem.id, label: savedItem.nom };
        setOpts((prev) => [...prev, newOpt]);
        if (onNewItem) onNewItem(newOpt);
        onChange(newOpt.value);
        setNewOption("");
        setAdding(false);
        setOpen(false);
      } catch (error) {
        console.error("Erreur lors de l’ajout :", error);
      }
    };

    return (
      <div className="relative w-full">
        <div className="border border-gray-300 rounded-lg px-4 py-2 cursor-pointer" onClick={() => setOpen(!open)}>
         {opts.find((o) => o.value === (value?.id ?? value))?.label || placeholder}

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
                <Input type="text" placeholder="Nouvel élément" value={newOption} onChange={(e) => setNewOption(e.target.value)} className="border p-1 rounded w-full"/>
                <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAddOption}><FaCheck /></button>
                <button type="button" className="px-3 py-1 bg-gray-300 text-black rounded" onClick={() => setAdding(false)}><FaTimes /></button>
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
        onNewItem={(newOpt) => setTypesFamille((prev) => [...prev, newOpt])} // 🔹 ICI
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
         onNewItem={(newOpt) => setHabitations((prev) => [...prev, newOpt])} // 🔹 ICI
       />
</div></div>



          <div className="md:col-span-2 mt-4">
                      <Label htmlFor="adresseFamille">عنوان العائلة</Label>
          <Input
            type="text"
            placeholder="عنوان العائلة"
            value={familleData.adresseFamille}
            onChange={(e) => setFamilleData({ ...familleData, adresseFamille: e.target.value })}
            className="border p-2 rounded w-full"
          /></div>
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
          /></div>   </div>

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
                let val = e.target.value.replace(/\D/g, ""); // garder que les chiffres
                if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
                if (val.length > 10) val = val.slice(0, 10);
                setFamilleData((prev) => ({ ...prev, dateInscription: val }));
              }}
            />
          </div></div></div>



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
      <label>هل الاب متوفي?</label>
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
          <label>هل الاب مريض?</label>
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
          <label>هل الاب يعمل?</label>
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
      <label>هل الام متوفاة?</label>
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
          <label>هل الام مريضة?</label>
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
          <label>هل الام تعمل?</label>
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


  </ComponentCard>
<ComponentCard title={<span className="font-bold">معلومات الأبناء</span>}>
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
                  newEnfants[index] = {
                    ...newEnfants[index],
                    prenom: e.target.value,
                  };
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
                  newEnfants[index] = {
                    ...newEnfants[index],
                    nom: e.target.value,
                  };
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
                  if (val.length > 5)
                    val = val.slice(0, 5) + "/" + val.slice(5, 9);
                  if (val.length > 10) val = val.slice(0, 10);

                  const newEnfants = [...enfants];
                  newEnfants[index] = {
                    ...newEnfants[index],
                    dateNaissance: val,
                  };
                  setEnfants(newEnfants);
                }}
              />
            </div>

            <div className="w-1/2">
              <Label htmlFor={`niveauscolaire-${index}`}>المستوى الدراسي</Label>
              <Select
                options={niveauxscolaires}
                value={enfants[index]?.niveauscolaire || ""}
               onChange={(val) => {
                 const newEnfants = [...enfants];
                 newEnfants[index] = {
                   ...newEnfants[index],
                   niveauscolaire: { id: val }, // ✅ envoyer objet avec id
                 };
                 setEnfants(newEnfants);
               }}

                placeholder="اختر المستوى الدراسي"
                apiUrl="http://localhost:8080/api/enfant/niveauScolaire"
                // 🔹 Ajout immédiat dans la liste globale des niveaux
                onNewItem={(newOpt) =>
                  setNiveauxscolaires((prev) => [...prev, newOpt])
                }
              />
            </div>

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
