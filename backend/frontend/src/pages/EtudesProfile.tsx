import { useParams } from "react-router";
import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { FaCheck, FaTimes } from "react-icons/fa";
import Input from "../components/form/input/InputField";

// TypeScript interfaces
interface Option {
  value: string | number;
  label: string;
}

/* ---------------------------------------------------------
   SELECT PERSONNALISÉ
--------------------------------------------------------- */
const Select = ({
  options = [],
  value,
  onChange,
  placeholder,
  apiUrl,
  onNewItem,
}: any) => {
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
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newOption }),
      });

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
   <div className="relative w-full min-w-[260px]">

      {/* Input stylé comme les autres */}
      <div
        className="border border-gray-300 rounded-lg px-4 py-2 cursor-pointer bg-white shadow-sm"
        onClick={() => setOpen(!open)}
      >
        {opts.find((o) => o.value === value)?.label || (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>

      {open && (
      <div className="absolute z-50 mt-1 w-[260px] border border-gray-300 rounded-lg bg-white shadow-lg max-h-60 overflow-auto">

          {opts.map((opt) => (
            <div
              key={opt.value}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </div>
          ))}

          {/* Ajouter un élément */}
          {!adding ? (
            <div
              className="px-4 py-2 text-blue-600 cursor-pointer hover:bg-gray-100"
              onClick={() => setAdding(true)}
            >
              + إضافة عنصر جديد
            </div>
          ) : (
            <div className="flex px-4 py-2 gap-2 items-center">
              <input
                type="text"
                className="border p-1 rounded w-full"
                placeholder="عنصر جديد"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
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

/* ---------------------------------------------------------
   PAGE ETUDES PROFILE
--------------------------------------------------------- */
export default function EtudesProfile() {
  const { enfantid } = useParams();

  const [rows, setRows] = useState([]);

  const [niveauxscolaires, setNiveauxscolaires] = useState<Option[]>([]);
  const [ecoles, setEcoles] = useState<Option[]>([]);

  /* ---------------------------------------------------------
     1. Charger études existantes
  --------------------------------------------------------- */
  useEffect(() => {
    fetch(`http://localhost:8080/api/etudes/all/${enfantid}`)
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((etude) => ({
          id: etude.id,
          annee: etude.anneeScolaire,
          niveau: etude.niveauScolaire?.id || "",
          ecole: etude.ecole?.id || "",
          note1: etude.note1 || "",
          note2: etude.note2 || "",
          resultat: etude.resultat || "",
        }));
        setRows(formatted);
      })
      .catch((err) => console.error(err));
  }, [enfantid]);

  /* ---------------------------------------------------------
     2. Charger listes Niveaux + Écoles
  --------------------------------------------------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nivRes, ecoRes] = await Promise.all([
          fetch("http://localhost:8080/api/niveaux"),
          fetch("http://localhost:8080/api/ecoles"),
        ]);

        const nivData = await nivRes.json();
        const ecoData = await ecoRes.json();

        setNiveauxscolaires(
          nivData.map((n: any) => ({ value: n.id, label: n.nom }))
        );

        setEcoles(
          ecoData.map((e: any) => ({ value: e.id, label: e.nom }))
        );
      } catch (err) {
        console.error("Erreur fetch :", err);
      }
    };

    fetchData();
  }, []);

  /* ---------------------------------------------------------
     3. Ajouter une ligne
  --------------------------------------------------------- */
let tempIdCounter = -1; // au niveau du fichier / composant

const addRow = () => {
  const newRow = {
    id: tempIdCounter--, // chaque ligne a un ID unique décroissant
    annee: "",
    niveau: "",
    ecole: "",
    note1: "",
    note2: "",
    resultat: "",
  };
  setRows((prev) => [...prev, newRow]);
};


  /* ---------------------------------------------------------
     4. Update row
  --------------------------------------------------------- */
  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  /* ---------------------------------------------------------
     5. Delete row
  --------------------------------------------------------- */
  const deleteRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  /* ---------------------------------------------------------
     6. Save row (POST / PUT)
  --------------------------------------------------------- */
const saveEtude = async (row) => {
  try {
   const url = row.id > 0
     ? `http://localhost:8080/api/etudes/${row.id}`  // PUT
     : `http://localhost:8080/api/etudes`;          // POST

   const res = await fetch(url, {
     method: row.id > 0 ? "PUT" : "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       anneeScolaire: row.annee,
       niveauScolaire: { id: row.niveau },
       ecole: { id: row.ecole },
       noteSemestre1: Number(row.note1),
       noteSemestre2: Number(row.note2),
       redoublon: row.resultat === "مكرر",
       enfant: { id: enfantid },
     }),
   });


    const data = await res.json();

    // 🔹 Mettre à jour l'ID temporaire par l'ID réel
    if (row.id <= 0) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, id: data.id } : r))
      );
    }
  } catch (err) {
    console.error(err);
  }
};



  return (
    <div className="p-6" dir="rtl">
      <PageBreadcrumb pageTitle="Profile" />

      <h2 className="text-xl font-bold mb-4">
        التتبع الدراسي للطفل رقم : {enfantid}
      </h2>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100 text-gray-800 font-semibold">
            <tr>
              <th className="p-3">السنة الدراسية</th>
              <th className="p-3">المستوى</th>
              <th className="p-3">المدرسة</th>
              <th className="p-3">نتيجة الأسدس 1</th>
              <th className="p-3">نتيجة الأسدس 2</th>
              <th className="p-3">النتيجة</th>
              <th className="p-3">عمليات</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                {/* Année */}
                <td className="p-3">
                  <input
                    type="text"
                    value={row.annee}
                    onChange={(e) =>
                      updateRow(row.id, "annee", e.target.value)
                    }
                    onBlur={() => saveEtude(row)}
                    className="w-full rounded border px-2 py-1 shadow-sm"
                  />
                </td>

                {/* Niveau */}
                <td className="p-3">
                <Select
                  options={niveauxscolaires}
                  value={row.niveau}
                  placeholder="اختر المستوى الدراسي"
                  apiUrl="http://localhost:8080/api/niveaux"
                  onChange={(val) => {
                    updateRow(row.id, "niveau", val);      // update la ligne
                    saveEtude({ ...row, niveau: val });   // sauvegarde
                  }}
                  onNewItem={(opt) => {
                    // Ajoute dans les options
                    setNiveauxscolaires((prev) => [...prev, opt]);
                    // Ajoute automatiquement dans la ligne en cours
                    updateRow(row.id, "niveau", opt.value);
                    saveEtude({ ...row, niveau: opt.value });
                  }}
                />

                </td>

                {/* École */}
                <td className="p-3">
               <Select
                 options={ecoles}
                 value={row.ecole}
                 placeholder="اختر المدرسة"
                 apiUrl="http://localhost:8080/api/ecoles"
                 onChange={(val) => {
                   updateRow(row.id, "ecole", val);
                   saveEtude({ ...row, ecole: val });
                 }}
                 onNewItem={(opt) => {
                   setEcoles((prev) => [...prev, opt]);
                   updateRow(row.id, "ecole", opt.value);
                   saveEtude({ ...row, ecole: opt.value });
                 }}
               />

                </td>

                {/* Notes */}
                <td className="p-3">
                  <input
                    type="number"
                    value={row.note1}
                    onChange={(e) =>
                      updateRow(row.id, "note1", e.target.value)
                    }
                    onBlur={() => saveEtude(row)}
                    className="w-full rounded border px-2 py-1 shadow-sm"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    value={row.note2}
                    onChange={(e) =>
                      updateRow(row.id, "note2", e.target.value)
                    }
                    onBlur={() => saveEtude(row)}
                    className="w-full rounded border px-2 py-1 shadow-sm"
                  />
                </td>

                {/* Résultat */}
                <td className="p-3">
                  <select
                    value={row.resultat}
                    onChange={(e) => {
                      updateRow(row.id, "resultat", e.target.value);
                      saveEtude({ ...row, resultat: e.target.value });
                    }}
                    className="w-full rounded border px-2 py-1 bg-white shadow-sm text-gray-700 cursor-pointer"
                  >
                    <option value="">-- اختر --</option>
                    <option value="ناجح">ناجح</option>
                    <option value="مكرر">مكرر</option>
                  </select>
                </td>

                {/* Actions */}
                <td className="p-3">
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded"
                    onClick={() => deleteRow(row.id)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ajouter */}
      <button
        onClick={addRow}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full"
      >
        + إضافة سطر جديد
      </button>
    </div>
  );
}
