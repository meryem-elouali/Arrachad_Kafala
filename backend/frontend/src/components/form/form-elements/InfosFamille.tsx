import { useState, useEffect } from "react";

import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import { FaCheck, FaTimes } from "react-icons/fa";

// 🔹 Composant SelectTypefamille intégré directement
const SelectTypefamille = ({ options = [], placeholder = "نوع الحالة", onChange }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [opts, setOpts] = useState(options);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
 useEffect(() => {
    setOpts(options);
  }, [options]);


  const handleSelect = (option) => {
    setSelected(option);
    onChange(option.value);
    setOpen(false);
  };

  const handleAddOption = async () => {
    if (!newOption.trim()) return;

    try {
      const response = await fetch("http://localhost:8080/api/famille/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newOption })
      });
      const savedType = await response.json();

      const newOpt = { value: savedType.id, label: savedType.nom };
      setOpts([...opts, newOpt]);
      setSelected(newOpt);
      onChange(newOpt.value);
      setNewOption("");
      setAdding(false);
      setOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout du type:", error);
    }
  };


  return (
    <div className="relative w-full">
      <div
        className="border border-gray-300 rounded-lg px-4 py-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {selected ? selected.label : placeholder}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full border border-gray-300 rounded-lg bg-white shadow-lg max-h-60 overflow-auto">
          {opts.map((opt) => (
            <div
              key={opt.value}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </div>
          ))}

          {!adding && (
            <div
              className="px-4 py-2 text-blue-600 cursor-pointer hover:bg-gray-100"
              onClick={() => setAdding(true)}
            >
              + Ajouter un type
            </div>
          )}

          {adding && (
            <div className="flex px-4 py-2 gap-2 items-center">
              <Input
                type="text"
                placeholder="Nouveau type"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white rounded flex items-center justify-center"
                onClick={handleAddOption}
              >
                <FaCheck />
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-gray-300 text-black rounded flex items-center justify-center"
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
// 🔹 Composant SelectHabitationfamille intégré directement
const SelectHabitationfamille = ({ options = [], placeholder = "نوع السكن", onChange }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [opts, setOpts] = useState(options);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
useEffect(() => {
    setOpts(options);
  }, [options]);
  const handleSelect = (option) => {
    setSelected(option);
    onChange(option.value);
    setOpen(false);
  };

  const handleAddOption = async () => {
      if (!newOption.trim()) return;

      try {
        const response = await fetch("http://localhost:8080/api/famille/habitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom: newOption })
        });
        const savedType = await response.json();

        const newOpt = { value: savedType.id, label: savedType.nom };
        setOpts([...opts, newOpt]);
        setSelected(newOpt);
        onChange(newOpt.value);
        setNewOption("");
        setAdding(false);
        setOpen(false);
      } catch (error) {
        console.error("Erreur lors de l'ajout du type:", error);
      }
    };

  return (
    <div className="relative w-full">
      <div
        className="border border-gray-300 rounded-lg px-4 py-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {selected ? selected.label : placeholder}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full border border-gray-300 rounded-lg bg-white shadow-lg max-h-60 overflow-auto">
          {opts.map((opt) => (
            <div
              key={opt.value}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </div>
          ))}

          {!adding && (
            <div
              className="px-4 py-2 text-blue-600 cursor-pointer hover:bg-gray-100"
              onClick={() => setAdding(true)}
            >
              + Ajouter un type
            </div>
          )}

          {adding && (
            <div className="flex px-4 py-2 gap-2 items-center">
              <Input
                type="text"
                placeholder="Nouveau type"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 text-white rounded flex items-center justify-center"
                onClick={handleAddOption}
              >
                <FaCheck />
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-gray-300 text-black rounded flex items-center justify-center"
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

// 🔹 Composant principal InfosFamille
export default function InfosFamille() {
  const [formData, setFormData] = useState({
    typeFamille: "",
    adresseFamille: "",
    nombreEnfants: 0,
    phone: "",
  });
  const [typesFamille, setTypesFamille] = useState([]);
  const [habitations, setHabitations] = useState([]);

 useEffect(() => {
    fetch("http://localhost:8080/api/famille/types")
      .then(res => res.json())
      .then(data => setTypesFamille(data.map(t => ({ value: t.id, label: t.nom }))))
      .catch(err => console.error(err));

    fetch("http://localhost:8080/api/famille/habitations")
      .then(res => res.json())
      .then(data => setHabitations(data.map(h => ({ value: h.id, label: h.nom }))))
      .catch(err => console.error(err));
  }, []);
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

 const handleSubmit = async (e) => {
   e.preventDefault();

 const familleData = {
   typeFamille: { id: formData.typeFamille },
   habitationFamille: { id: formData.habitationFamille }, // ⚡ le nom exact
   adresseFamille: formData.adresseFamille,               // ⚡ nom exact
   nombreEnfants: parseInt(formData.nombreEnfants, 10),
   phone: formData.phone,
   dateInscription: formData.dateInscription
     ? formData.dateInscription.split("/").reverse().join("-") // convertir DD/MM/YYYY → YYYY-MM-DD
     : null,
 };


   try {
     const response = await fetch("http://localhost:8080/api/famille", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(familleData),
     });

     if (response.ok) {
       const savedFamille = await response.json();
       console.log("Famille enregistrée :", savedFamille);
       alert("✅ Famille enregistrée avec succès !");
       // Optionnel : réinitialiser le formulaire
       setFormData({
         typeFamille: "",
         adresseFamille: "",
         nombreEnfants: 0,
         phone: "",
         habitationFamille: "",
         dateInscription: "",
       });
     } else {
       console.error("Erreur serveur :", response.statusText);
       alert("⚠️ Erreur lors de l’enregistrement de la famille !");
     }
   } catch (error) {
     console.error("Erreur réseau :", error);
     alert("❌ Impossible de contacter le serveur !");
   }
 };


  return (
    <ComponentCard title="معلومات عامة">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 mt-4">
         <SelectTypefamille
           options={typesFamille}
           value={formData.typeFamille}    // ⚡ Valeur sélectionnée
           onChange={(val) => handleSelectChange("typeFamille", val)}
         />
          </div>
<div className="md:col-span-2 mt-4">
<SelectHabitationfamille
  options={habitations}
  value={formData.habitationFamille}  // ⚡ Valeur sélectionnée
  onChange={(val) => handleSelectChange("habitationFamille", val)}
/>
</div>

          <div className="md:col-span-2 mt-4">
            <Label htmlFor="adresseFamille">عنوان العائلة</Label>
            <Input
              type="text"
              id="adresseFamille"
              value={formData.adresseFamille}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col">
            <Label htmlFor="nombreEnfants">عدد الأبناء</Label>
            <Input
              type="number"
              id="nombreEnfants"
              value={formData.nombreEnfants}
              onChange={handleChange}
              min={0}
            />
          </div>

          <div className="flex flex-col">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              type="text"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
           <div className="flex flex-col md:col-span-2">
             <Label htmlFor="dateInscription">تاريخ التسجيل</Label>
             <Input
               type="text"
               id="dateInscription"
               placeholder="__/__/____"
               value={formData.dateInscription}
               onChange={(e) => {
                 let val = e.target.value.replace(/\D/g, ""); // garder que les chiffres
                 if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                 if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
                 if (val.length > 10) val = val.slice(0, 10);
                 setFormData((prev) => ({ ...prev, dateInscription: val }));
               }}
             />
           </div>

        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow-md transition"
          >
            💾 Enregistrer
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
