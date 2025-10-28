import { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { FaCheck, FaTimes } from "react-icons/fa";
import Label from "../../components/form/Label";

import ComponentCard from "../../components/common/ComponentCard";
export default function FormElements() {
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
  const [typesFamille, setTypesFamille] = useState([]);
  const [habitations, setHabitations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8080/api/famille/types")
      .then(res => res.json())
      .then(data => setTypesFamille(data.map(t => ({ value: t.id, label: t.nom }))))
      .catch(console.error);

    fetch("http://localhost:8080/api/famille/habitations")
      .then(res => res.json())
      .then(data => setHabitations(data.map(h => ({ value: h.id, label: h.nom }))))
      .catch(console.error);
  }, []);

  const handleSubmitAll = async () => {
    setLoading(true);
    try {
      // 1️⃣ Envoyer InfosMere d'abord
      const formData = new FormData();
      Object.entries(mereData).forEach(([key, value]) => {
        formData.append(key, value);
      });
      const responseMere = await fetch("http://localhost:8080/api/mere", {
        method: "POST",
        body: formData,
      });
      const savedMere = await responseMere.json();
      console.log("Mère enregistrée :", savedMere);

      // 2️⃣ Ajouter l'id de la mère dans la famille
      const familleToSave = { ...familleData, mere: { id: savedMere.id } };

      // 3️⃣ Envoyer InfosFamille
      const responseFamille = await fetch("http://localhost:8080/api/famille", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familleToSave),
      });
      const savedFamille = await responseFamille.json();
      console.log("Famille enregistrée :", savedFamille);

      alert("✅ Famille et Mère enregistrées avec succès !");
    } catch (error) {
      console.error(error);
      alert("❌ Erreur lors de l'enregistrement !");
    } finally {
      setLoading(false);
    }
  };


  // 🔹 Composant Select générique
  // 🔹 Composant Select générique
  const Select = ({ options = [], value, onChange, placeholder, apiUrl, onNewItem }) => {
    const [open, setOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newOption, setNewOption] = useState("");
    const [opts, setOpts] = useState(options);

    useEffect(() => {
      setOpts(options);
    }, [options]);

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

        // 🆕 Ajout immédiat dans la liste locale
        setOpts((prev) => [...prev, newOpt]);

        // 🆕 Informer le parent pour qu’il mette aussi à jour sa liste
        if (onNewItem) onNewItem(newOpt);

        // 🆕 Sélectionner automatiquement la nouvelle option
        onChange(newOpt.value);

        // ✅ Réinitialiser
        setNewOption("");
        setAdding(false);
        setOpen(false);
      } catch (error) {
        console.error("Erreur lors de l’ajout :", error);
      }
    };

    return (
      <div className="relative w-full">
        <div
          className="border border-gray-300 rounded-lg px-4 py-2 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          {opts.find(o => o.value === value)?.label || placeholder}
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full border border-gray-300 rounded-lg bg-white shadow-lg max-h-60 overflow-auto">
            {opts.map(opt => (
              <div
                key={opt.value}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(opt)}
              >
                {opt.label}
              </div>
            ))}

            {!adding ? (
              <div
                className="px-4 py-2 text-blue-600 cursor-pointer hover:bg-gray-100"
                onClick={() => setAdding(true)}
              >
                + Ajouter un élément
              </div>
            ) : (
              <div className="flex px-4 py-2 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nouvel élément"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  className="border p-1 rounded w-full"
                />
                <button
                  type="button"
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                  onClick={handleAddOption}
                >
                  <FaCheck />
                </button>
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-300 text-black rounded"
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
         <ComponentCard title="معلومات عامة">

          <h2 className="font-bold text-lg">معلومات العائلة</h2>
       <Select
         options={typesFamille}
         value={familleData.typeFamille?.id || ""}
         onChange={(val) =>
           setFamilleData({
             ...familleData,
             typeFamille: { id: val }, // <-- objet complet attendu par Spring
           })
         }
         placeholder="نوع الحالة"
         apiUrl="http://localhost:8080/api/famille/types"
       />

       <Select
         options={habitations}
         value={familleData.habitationFamille?.id || ""}
         onChange={(val) =>
           setFamilleData({
             ...familleData,
             habitationFamille: { id: val }, // <-- objet complet attendu
           })
         }
         placeholder="نوع السكن"
         apiUrl="http://localhost:8080/api/famille/habitations"
       />



          <div className="md:col-span-2 mt-4">
                      <Label htmlFor="adresseFamille">عنوان العائلة</Label>
          <input
            type="text"
            placeholder="عنوان العائلة"
            value={familleData.adresseFamille}
            onChange={(e) => setFamilleData({ ...familleData, adresseFamille: e.target.value })}
            className="border p-2 rounded w-full"
          /></div>
           <div className="md:col-span-2 mt-4">
                                <Label htmlFor="nombreEnfants">عدد الأبناء</Label>
          <input
            type="number"
            placeholder="عدد الأبناء"
            min={0}
            value={familleData.nombreEnfants}
            onChange={(e) => setFamilleData({ ...familleData, nombreEnfants: parseInt(e.target.value) })}
            className="border p-2 rounded w-full"
          /></div>
           <div className="md:col-span-2 mt-4">
                                <Label htmlFor="numphone">رقم الهاتف</Label>
          <input
            type="text"
            placeholder="رقم الهاتف"
            value={familleData.phone}
            onChange={(e) => setFamilleData({ ...familleData, phone: e.target.value })}
            className="border p-2 rounded w-full"
          /></div>
           <div className="md:col-span-2 mt-4">
                                <Label htmlFor="dateInscription">تاريخ التسجيل</Label>
          <input
            type="text"
            placeholder="__/__/____"
            value={familleData.dateInscription}
            onChange={(e) => setFamilleData({ ...familleData, dateInscription: e.target.value })}
            className="border p-2 rounded w-full"
          /></div>

</ComponentCard>
  <ComponentCard title="معلومات الام">
    <h2 className="font-bold text-lg">معلومات الأم</h2>

    {/* Nom et Prénom toujours visibles */}
    <input
      type="text"
      placeholder="Nom"
      value={mereData.nom}
      onChange={(e) => setMereData({ ...mereData, nom: e.target.value })}
      className="border p-2 rounded w-full"
    />
    <input
      type="text"
      placeholder="Prénom"
      value={mereData.prenom}
      onChange={(e) => setMereData({ ...mereData, prenom: e.target.value })}
      className="border p-2 rounded w-full"
    />

    {/* Si non décédée, afficher les autres champs */}
    {!mereData.estDecedee && (
      <>
        <input
          type="text"
          placeholder="CIN"
          value={mereData.cin}
          onChange={(e) => setMereData({ ...mereData, cin: e.target.value })}
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          placeholder="Téléphone"
          value={mereData.phone}
          onChange={(e) => setMereData({ ...mereData, phone: e.target.value })}
          className="border p-2 rounded w-full"
        />

        {/* Checkbox Malade */}
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            checked={mereData.estMalade}
            onChange={(e) => setMereData({ ...mereData, estMalade: e.target.checked })}
            className="mr-2"
          />
          <label>Malade</label>
        </div>
        {mereData.estMalade && (
          <input
            type="text"
            placeholder="Description de la maladie"
            value={mereData.typeMaladie}
            onChange={(e) => setMereData({ ...mereData, typeMaladie: e.target.value })}
            className="border p-2 rounded w-full mt-2"
          />
        )}

        {/* Checkbox Travaille */}
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            checked={mereData.estTravaille}
            onChange={(e) => setMereData({ ...mereData, estTravaille: e.target.checked })}
            className="mr-2"
          />
          <label>Travaille</label>
        </div>
        {mereData.estTravaille && (
          <input
            type="text"
            placeholder="Description du travail"
            value={mereData.typeTravail}
            onChange={(e) => setMereData({ ...mereData, typeTravail: e.target.value })}
            className="border p-2 rounded w-full mt-2"
          />
        )}
      </>
    )}

    {/* Checkbox Décédée */}
    <div className="flex items-center mt-4">
      <input
        type="checkbox"
        checked={mereData.estDecedee}
        onChange={(e) => setMereData({ ...mereData, estDecedee: e.target.checked })}
        className="mr-2"
      />
      <label>Décédée</label>
    </div>

    {/* Si décédée, afficher seulement les champs essentiels */}
    {mereData.estDecedee && (
      <div className="mt-2 space-y-2">

        <input
          type="text"
          placeholder="Date de décès"
          value={mereData.dateDeces}
          onChange={(e) => setMereData({ ...mereData, dateDeces: e.target.value })}
          className="border p-2 rounded w-full"
        />

      </div>
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
