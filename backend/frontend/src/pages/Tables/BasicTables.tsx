import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode } from 'primereact/api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function FamillesTable() {
  const [familles, setFamilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    nomFamille: { value: null, matchMode: FilterMatchMode.CONTAINS },
    nomCompletMere: { value: null, matchMode: FilterMatchMode.CONTAINS },
    nombreEnfants: { value: null, matchMode: FilterMatchMode.EQUALS },
    typeFamilleNom: { value: null, matchMode: FilterMatchMode.EQUALS }, // ✅ utiliser EQUALS
  });

  const [typesFamille, setTypesFamille] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8080/api/famille')
      .then(res => {
        const data = res.data.map(famille => ({
          ...famille,
          nomFamille: famille.pere?.nom || famille.mere?.nom || '—',
          nomCompletMere: famille.mere ? `${famille.mere.nom} ${famille.mere.prenom}` : '—',
          nombreEnfants: Number(famille.nombreEnfants || 0),
          typeFamilleNom: famille.typeFamille?.nom || '—'
        }));
        setFamilles(data);

        const uniqueTypes = [...new Set(data.map(f => f.typeFamilleNom).filter(t => t && t !== '—'))]
          .map(t => ({ label: t, value: t }));
        setTypesFamille(uniqueTypes);

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const actionBodyTemplate = (rowData) => (
    <Button
      label="Voir"
      icon="pi pi-eye"
      className="p-button-info"
      onClick={() => navigate(`/familleprofile/${rowData.id}`)}
    />
  );

 const nombreEnfantsFilter = (options) => (
   <InputText
     type="number"
     value={filters.nombreEnfants?.value ?? ''}
     onChange={(e) => {
       const val = e.target.value;
       setFilters(prev => ({
         ...prev,
         nombreEnfants: { ...prev.nombreEnfants, value: val !== '' ? Number(val) : null }
       }));
     }}
     placeholder="عدد الأطفال"
     className="p-column-filter"
      showClear={false}
   />
 );

 const typeFamilleFilter = (options) => (
   <Dropdown
     value={filters.typeFamilleNom?.value ?? null}
     options={typesFamille}
     onChange={(e) =>
       setFilters(prev => ({
         ...prev,
         typeFamilleNom: { ...prev.typeFamilleNom, value: e.value ?? null }
       }))
     }
     placeholder="نوع العائلة"
     className="p-column-filter"
     showClear={false}
     optionLabel="label"
     optionValue="value"
   />
 );
const handleExport = () => {
  // Récupérer les données filtrées
  let dataToExport = familles;

  // Appliquer manuellement les filtres si nécessaire
  Object.keys(filters).forEach(key => {
    const filter = filters[key];
    if (filter && filter.value !== null && filter.value !== '') {
      if (filter.matchMode === FilterMatchMode.CONTAINS) {
        dataToExport = dataToExport.filter(item =>
          item[key]?.toString().toLowerCase().includes(filter.value.toString().toLowerCase())
        );
      } else if (filter.matchMode === FilterMatchMode.EQUALS) {
        dataToExport = dataToExport.filter(item =>
          item[key] === filter.value
        );
      }
    }
  });

  // Préparer les colonnes que vous voulez exporter
  const exportData = dataToExport.map(item => ({
    "اسم العائلة": item.nomFamille,
    "اسم الأم الكامل": item.nomCompletMere,
    "عدد الأطفال": item.nombreEnfants,
    "نوع العائلة": item.typeFamilleNom,
  }));

  // Créer le workbook
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Familles");

  // Exporter le fichier Excel
  XLSX.writeFile(workbook, "familles.xlsx");
};


  return (
    <div className="p-6 bg-white rounded-xl shadow-md" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">📋 قائمة العائلات</h1>

      <DataTable
        value={familles}
        paginator
        rows={10}
        loading={loading}
        filterDisplay="row"
        filters={filters}
        onFilter={(e) => setFilters(e.filters)}
        className="p-datatable-striped p-datatable-gridlines"
        emptyMessage="لا توجد بيانات"

      >
        <Column
          field="nomFamille"
          header="اسم العائلة"
          filter
          filterPlaceholder="بحث..."
          sortable
          showFilterMenu={false}
          style={{ textAlign: 'right' }}
        />
        <Column
          field="nomCompletMere"
          header="اسم الأم الكامل"
          filter
          filterPlaceholder="بحث..."
          sortable
          showFilterMenu={false}
          style={{ textAlign: 'right' }}
        />
        <Column
          field="nombreEnfants"
          header="عدد الأطفال"
          filter
          filterElement={nombreEnfantsFilter}
          sortable
          showFilterMenu={false}
          style={{ textAlign: 'center' }}
        />
        <Column
          field="typeFamilleNom"
          header="نوع العائلة"
          filter
          filterElement={typeFamilleFilter}
          sortable
          showFilterMenu={false}
          style={{ textAlign: 'right' }}
        />
        <Column
          body={actionBodyTemplate}
          header="الإجراء"
          style={{ textAlign: 'center', width: '120px' }}
        />
      </DataTable>
           <div className="mt-4 flex justify-start">
                  <Button  icon="pi pi-download"  label="تصدير" className="p-button-success" onClick={handleExport}></Button>
                </div>
    </div>
  );
}
