import React, { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import FormElements from "../Forms/AjoutFamille";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface Enfant {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance: string;
}

interface Famille {
  id: number;
  nomFamille: string;
  phone: string;
  mere?: { nom: string; prenom: string };
  pere?: { nom: string; prenom: string };
   typeFamille?: { nom: string };
  enfants?: Enfant[];
  niveauScolaire?: { nom: string };
}

export default function BasicTables() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [loading, setLoading] = useState(true);

// À l'intérieur de ton composant BasicTables
const navigate = useNavigate();
  useEffect(() => {
    axios.get("http://localhost:8080/api/famille") // Assure-toi que ton endpoint renvoie bien un tableau de familles
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : []; // sécurité : res.data doit être un tableau
        setFamilles(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur API familles:", err);
        setFamilles([]);
        setLoading(false);
      });
  }, []);

  const BasicTableOne = () => (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]" dir="rtl">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>

              <TableCell isHeader>اسم الأم</TableCell>
              <TableCell isHeader>الهاتف</TableCell>
              <TableCell isHeader>عدد الأبناء</TableCell>
               <TableCell isHeader>نوع الكفالة</TableCell>
              <TableCell isHeader>action</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {familles.map(famille => (
              <TableRow key={famille.id}>

                <TableCell>{famille.mere ? `${famille.mere.nom} ${famille.mere.prenom}` : "N/A"}</TableCell>
               <TableCell>{famille.phone || "N/A"}</TableCell>

              <TableCell>
                {famille.enfants && famille.enfants.length > 0 ? famille.enfants.length : 0}
              </TableCell>


                 <TableCell>{famille.typeFamille ? `${famille.typeFamille.nom} ` : "N/A"}</TableCell>
                 <TableCell>
                   <button
                     onClick={() => navigate("/profile", { state: { famille } })}
                     className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                   >
                     Accéder
                   </button>
                 </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <PageMeta title="React.js Basic Tables Dashboard" description="Liste des familles" />
      <PageBreadcrumb pageTitle="Basic Tables" />

      <div className="mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Ajouter
        </button>
      </div>

      <div className="space-y-6">
        <ComponentCard title="Basic Table 1">
          {loading ? <p>Chargement des familles...</p> : <BasicTableOne />}
        </ComponentCard>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-3/4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Ajouter une famille</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">X</button>
            </div>
            <FormElements />
          </div>
        </div>
      )}
    </>
  );
}
