import { useState } from "react";
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

  const handleSelect = (option) => {
    setSelected(option);
    onChange(option.value);
    setOpen(false);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const newOpt = { value: newOption.toLowerCase(), label: newOption };
    setOpts([...opts, newOpt]);
    setSelected(newOpt);
    onChange(newOpt.value);
    setNewOption("");
    setAdding(false);
    setOpen(false);
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

  const handleSelect = (option) => {
    setSelected(option);
    onChange(option.value);
    setOpen(false);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const newOpt = { value: newOption.toLowerCase(), label: newOption };
    setOpts([...opts, newOpt]);
    setSelected(newOpt);
    onChange(newOpt.value);
    setNewOption("");
    setAdding(false);
    setOpen(false);
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

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(formData);
    // Ici tu peux appeler ton API
  };

  return (
    <ComponentCard title="معلومات عامة">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 mt-4">
            <SelectTypefamille
              options={[
                { value: "1", label: "Option 1" },
                { value: "2", label: "Option 2" },
              ]}
              onChange={(val) => handleSelectChange("typeFamille", val)}
            />
          </div>
<div className="md:col-span-2 mt-4">
  <SelectHabitationfamille
    options={[
      { value: "appartement", label: "Appartement" },
      { value: "maison", label: "Maison" },
    ]}
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
