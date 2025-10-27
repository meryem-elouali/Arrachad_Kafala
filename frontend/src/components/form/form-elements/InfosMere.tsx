import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import DropzoneComponent from "./DropZone";

export default function InfosMere() {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    cin: "",
    phone: "",
    villeNaissance: "",
    dateNaissance: "",
    dateDeces: "",
    typeMaladie: "",
    typeTravail: "",
    photoMere: null,
    estDecedee: false,
    estMalade: false,
    estTravaille: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCheckbox = (e) => {
    const { id, checked } = e.target;
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };

  const handleDateChange = (e) => {
    const { id, value } = e.target;
    let val = value.replace(/\D/g, "");
    if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
    if (val.length > 10) val = val.slice(0, 10);
    setFormData((prev) => ({ ...prev, [id]: val }));
  };

  // Convertir DD/MM/YYYY -> YYYY-MM-DD
  const formatDateForBackend = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
  };

  // Convertir fichier en Base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // On garde juste le Base64
      reader.onerror = (error) => reject(error);
    });
const handleSave = async () => {
  try {
    const data = new FormData();
    data.append("nom", formData.nom);
    data.append("prenom", formData.prenom);
    data.append("cin", formData.cin);
    data.append("phone", formData.phone);
    data.append("villeNaissance", formData.villeNaissance);
    data.append("dateNaissance", formData.dateNaissance);
    data.append("dateDeces", formData.dateDeces);
    data.append("simalade", estMalade);
    data.append("descmaladie", formData.typeMaladie);
    data.append("sitravaille", estTravaille);
    data.append("desctravaille", formData.typeTravail);
    data.append("sideceder", estDecedee);
    if (formData.photoMere) {
      data.append("photo", formData.photoMere);
    }

    const response = await fetch("http://localhost:8080/api/mere", {
      method: "POST",
      body: data, // PAS de JSON.stringify ici !
    });

    if (!response.ok) throw new Error("Erreur serveur");

    const saved = await response.json();
    console.log("Mère sauvegardée:", saved);
    alert("Enregistré avec succès !");
  } catch (error) {
    console.error(error);
    alert("Erreur serveur");
  }
};


  return (
    <ComponentCard title="معلومات الأم">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Checkbox Mère décédée */}
        <div className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" id="estDecedee" checked={formData.estDecedee} onChange={handleCheckbox} />
          <Label htmlFor="estDecedee">الأم متوفية</Label>
        </div>

        {/* Nom et Prénom */}
        <div className="flex flex-col">
          <Label htmlFor="nom">الاسم</Label>
          <Input type="text" id="nom" value={formData.nom} onChange={handleChange} />
        </div>
        <div className="flex flex-col">
          <Label htmlFor="prenom">النسب</Label>
          <Input type="text" id="prenom" value={formData.prenom} onChange={handleChange} />
        </div>

        {/* Date de décès si décédée */}
        {formData.estDecedee && (
          <div className="flex flex-col md:col-span-2">
            <Label htmlFor="dateDeces">تاريخ وفاة الأم</Label>
            <Input type="text" id="dateDeces" placeholder="__/__/____" value={formData.dateDeces} onChange={handleDateChange} />
          </div>
        )}

        {/* Champs si vivante */}
        {!formData.estDecedee && (
          <>
            <div className="flex flex-col">
              <Label htmlFor="cin">رقم البطاقة الوطنية</Label>
              <Input type="text" id="cin" value={formData.cin} onChange={handleChange} placeholder="12345678" />
            </div>
            <div className="flex flex-col">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input type="text" id="phone" value={formData.phone} onChange={handleChange} placeholder="06 12 34 56 78" />
            </div>
            <div className="flex flex-col md:col-span-2">
              <Label htmlFor="dateNaissance">تاريخ ازدياد الأم</Label>
              <Input type="text" id="dateNaissance" placeholder="__/__/____" value={formData.dateNaissance} onChange={handleDateChange} />
            </div>
            <div className="flex flex-col">
              <Label htmlFor="villeNaissance">مكان الازدياد</Label>
              <Input type="text" id="villeNaissance" value={formData.villeNaissance} onChange={handleChange} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="estMalade" checked={formData.estMalade} onChange={handleCheckbox} />
              <Label htmlFor="estMalade">الأم مريضة</Label>
            </div>
            {formData.estMalade && (
              <div className="flex flex-col">
                <Label htmlFor="typeMaladie">نوع المرض</Label>
                <Input type="text" id="typeMaladie" value={formData.typeMaladie} onChange={handleChange} placeholder="ادخل نوع المرض" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="estTravaille" checked={formData.estTravaille} onChange={handleCheckbox} />
              <Label htmlFor="estTravaille">الأم تعمل</Label>
            </div>
            {formData.estTravaille && (
              <div className="flex flex-col">
                <Label htmlFor="typeTravail">نوع العمل</Label>
                <Input type="text" id="typeTravail" value={formData.typeTravail} onChange={handleChange} placeholder="ادخل نوع العمل" />
              </div>
            )}
            <div className="md:col-span-2 mt-4">
              <DropzoneComponent label="صورة الام" id="photoMere" onFileSelect={(file) => setFormData((prev) => ({ ...prev, photoMere: file }))} />
            </div>
          </>
        )}

        {/* Bouton sauvegarder */}
        <div className="md:col-span-2 mt-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
          {message && <p className="mt-2 text-sm">{message}</p>}
        </div>
      </div>
    </ComponentCard>
  );
}
