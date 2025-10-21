import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import BirthDateInput from "./BirthDateInput";
import SelectTypefamille from "./SelectTypefamille";
import SelectHabitationfamille from "./SelectHabitationfamille";

export default function InfosFamille() {
  // 🔹 États des champs du formulaire
  const [formData, setFormData] = useState({
    typeFamille: "",
    adresseFamille: "",
    habitationFamille: "",
    nombreEnfants: 0,
    phone: "",
    dateInscription: "",
  });

  // 🔹 Gérer le changement dans les champs
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // 🔹 Gérer les changements des sélecteurs personnalisés
  const handleSelectChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 🔹 Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/famille", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("✅ Les informations ont été enregistrées avec succès !");
        setFormData({
          typeFamille: "",
          adresseFamille: "",
          habitationFamille: "",
          nombreEnfants: 0,
          phone: "",
          dateInscription: "",
        });
      } else {
        alert("⚠️ Erreur lors de l’enregistrement.");
      }
    } catch (error) {
      console.error("Erreur :", error);
      alert("❌ Une erreur s’est produite côté client.");
    }
  };

  return (
    <ComponentCard title="معلومات عامة">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type de famille */}
          <div className="md:col-span-2 mt-4">
            <SelectTypefamille
              options={[{ value: "1", label: "Option 1" }]}
              onChange={(val) => handleSelectChange("typeFamille", val)}
            />
          </div>

          {/* Adresse */}
          <div className="md:col-span-2 mt-4">
            <Label htmlFor="adresseFamille">عنوان العائلة</Label>
            <Input
              type="text"
              id="adresseFamille"
              value={formData.adresseFamille}
              onChange={handleChange}
            />
          </div>

          {/* Habitation */}
          <div className="md:col-span-2 mt-4">
            <SelectHabitationfamille
              options={[{ value: "1", label: "Option 1" }]}
              onChange={(val) => handleSelectChange("habitationFamille", val)}
            />
          </div>

          {/* Nombre d’enfants */}
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

          {/* Téléphone */}
          <div className="flex flex-col">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              type="text"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="06 12 34 56 78"
            />
          </div>

          {/* Date d’inscription */}
          <BirthDateInput
            id="dateInscription"
            label="تاريخ التسجيل"
            value={formData.dateInscription}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, dateInscription: val }))
            }
          />
        </div>

        {/* Bouton Enregistrer */}
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
