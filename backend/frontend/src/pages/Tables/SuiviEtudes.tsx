import React, { useState, useEffect } from 'react';
import { FilterMatchMode } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import axios from 'axios';
import Select from "../../components/form/Select";
import MultiSelect from "../../components/form/MultiSelect";
import { Button } from 'primereact/button';
import { Modal } from "../../components/ui/modal";
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primeicons/primeicons.css';
import './EtudesTable.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MultiSelect1 from "../../components/form/MultiSelect1";
export default function EtudesTable() {
  const [etudes, setEtudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    niveauNom: { value: null, matchMode: FilterMatchMode.EQUALS },
     nomEnfant: { value: null, matchMode: FilterMatchMode.CONTAINS }, // pour le champ texte
    nomEcole: { value: null, matchMode: FilterMatchMode.EQUALS },
    anneeScolaire: { value: null, matchMode: FilterMatchMode.EQUALS }
  });

  const [niveauxOptions, setNiveauxOptions] = useState([]);
  const [ecolesOptions, setEcolesOptions] = useState([]);
  const [anneesOptions, setAnneesOptions] = useState([]);

  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [exportNiveaux, setExportNiveaux] = useState([]);
  const [exportEcoles, setExportEcoles] = useState([]);
  const [noteMin, setNoteMin] = useState('');
  const [noteMax, setNoteMax] = useState('');

  const exportableFields = [
    { text: "الاسم الكامل", value: "nomEnfant" },
    { text: "المستوى", value: "niveauNom" },
    { text: "المؤسسة", value: "nomEcole" },
    { text: "السنة الدراسية", value: "anneeScolaire" },
    { text: "معدل النجاح", value: "noteSemestre1" },
  ];

  useEffect(() => {
    axios.get('http://localhost:8080/api/etudes/latest')
      .then(res => {
        const data = res.data.map(e => ({
          ...e,
          nomEnfant: e.enfant ? `${e.enfant.nom} ${e.enfant.prenom}` : '—',
          prenomEnfant: e.enfant?.prenom || '—',
          nomEcole: e.ecole?.nom || '—',
          niveauNom: e.niveauScolaire?.nom || '—'
        }));

        setEtudes(data);

        const niveaux = [...new Set(data.map(d => d.niveauNom))];
        const ecoles = [...new Set(data.map(d => d.nomEcole))];
        const annees = [...new Set(data.map(d => d.anneeScolaire))];

        setNiveauxOptions(niveaux.map((n, idx) => ({ text: n, value: n })));
        setEcolesOptions(ecoles.map((e, idx) => ({ text: e, value: e })));
        setAnneesOptions(annees.map(a => ({ label: a, value: a })));

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setFilters({ ...filters, global: { ...filters.global, value } });
    setGlobalFilterValue(value);
  };

 const niveauFilterTemplate = (options) => (
   <Dropdown
     value={options.value || null}          // valeur sélectionnée
     options={niveauxOptions}
     optionLabel="text"
     optionValue="value"
     placeholder="اختيار المستوى"
     onChange={(e) => options.filterCallback(e.value)}
     className="w-full"
     appendTo="self"
     showClear={false}                       // ← désactive la croix
   />
 );

const ecoleFilterTemplate = (options) => (
  <Dropdown
    value={options.value || null}
    options={ecolesOptions}
    optionLabel="text"
    optionValue="value"
    placeholder="اختيار المؤسسة"
    onChange={(e) => options.filterCallback(e.value)}
    showClear
    className="w-full"
  />
);




  const anneeFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={anneesOptions}
      onChange={(e) => options.filterCallback(e.value)}
      placeholder="اختيار السنة"
      showClear
      className="w-full"

    />
  );

  const exportExcel = (data) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Etudes");
    XLSX.writeFile(workbook, "etudes.xlsx");
  };

  const exportPDF = (data) => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [selectedFields],
      body: data.map(d => selectedFields.map(f => d[f])),
    });
    doc.save("etudes.pdf");
  };

 const handleExport = () => {
     if (!exportFormat) return alert("يرجى اختيار صيغة التصدير");

     // on part de toutes les données
     let filteredData = [...etudes];

     // Filtrer par niveau si sélectionné
     if (exportNiveaux && exportNiveaux.length > 0) {
         filteredData = filteredData.filter(e => exportNiveaux.includes(e.niveauNom));
     }

     // Filtrer par école si sélectionnée
     if (exportEcoles && exportEcoles.length > 0) {
         filteredData = filteredData.filter(e => exportEcoles.includes(e.nomEcole));
     }

     // Filtrer par note minimale si définie
     if (noteMin !== '' && noteMin !== null && !isNaN(noteMin)) {
         filteredData = filteredData.filter(e => e.noteSemestre1 >= Number(noteMin));
     }

     // Filtrer par note maximale si définie
     if (noteMax !== '' && noteMax !== null && !isNaN(noteMax)) {
         filteredData = filteredData.filter(e => e.noteSemestre1 <= Number(noteMax));
     }

     // Sélection des champs à exporter : si aucun champ sélectionné, prendre tout
     let exportFields = selectedFields && selectedFields.length > 0 ? selectedFields : exportableFields.map(f => f.value);

     const finalData = filteredData.map(row => {
         let obj = {};
         exportFields.forEach(field => obj[field] = row[field]);
         return obj;
     });

     // Export selon le format choisi
     exportFormat === "excel" ? exportExcel(finalData) : exportPDF(finalData);

     setExportDialogVisible(false);
 };


  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

     <span className="relative w-full sm:w-64">
       <i className="pi pi-search absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
       <InputText
         value={globalFilterValue}
         onChange={onGlobalFilterChange}
         placeholder="ابحث هنا..."
         className="w-full pl-8" // padding-left pour laisser de la place à l'icône
       />
     </span>

    </div>
  );

  return (
   <div className="etudes-table" dir="rtl">
      <div className="mb-6 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold mb-1 text-gray-800 dark:text-white">📚 التتبع الدراسي للابناء</h1>
        <p className="text-gray-500 dark:text-gray-400">عرض جميع بيانات الطلاب والمستويات والمؤسسات مع خيارات البحث والتصفية.</p>
      </div>

      <DataTable
        value={etudes}
        paginator
        rows={10}
        dataKey="id"
        filters={filters}
        filterDisplay="row"
        loading={loading}
        globalFilterFields={["nomEnfant", "prenomEnfant", "nomEcole", "niveauNom"]}
        header={header}
        emptyMessage="لا توجد بيانات."
        responsiveLayout="scroll"
        rowHover
        className="p-datatable-striped p-datatable-gridlines rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
       selectionMode="single"
       onSelectionChange={(e) => navigate(`/EtudesProfile/${e.value.enfant?.id}`)}

      >
        <Column field="nomEnfant" header="الاسم الكامل" filter filterPlaceholder="بحث بالاسم" sortable  showFilterMenu={false} style={{ textAlign: 'right' }}/>
        <Column field="niveauNom" header="المستوى" filter filterElement={niveauFilterTemplate} sortable showFilterMenu={false} style={{ textAlign: 'right' }}/>
        <Column field="nomEcole" header="المؤسسة" filter filterElement={ecoleFilterTemplate} sortable showFilterMenu={false} style={{ textAlign: 'right' }}/>
        <Column field="anneeScolaire" header="السنة الدراسية" filter filterElement={anneeFilterTemplate} sortable showFilterMenu={false} style={{ textAlign: 'right' }}/>
        <Column field="noteSemestre1" header="معدل النجاح" sortable style={{ textAlign: 'center' }}/>
      </DataTable>

     <div className="mt-4 flex justify-start">
       <Button
         icon="pi pi-download"
         label="تصدير"
         onClick={() => setExportDialogVisible(true)}
         className="p-button-success"
       />
     </div>


      <Modal isOpen={exportDialogVisible} onClose={() => setExportDialogVisible(false)} className="max-w-xl m-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-8 max-h-[600px] overflow-y-auto">
          <h4 className="text-2xl font-semibold mb-3 text-gray-800 dark:text-white">خيارات التصدير</h4>
          <p className="text-gray-500 mb-6">اختر صيغة التصدير، الحقول، وفلترة البيانات قبل التصدير.</p>

          <div className="flex flex-col gap-4">
            <Select
              label="الصيغة"
              value={exportFormat}
              options={[
                { label: "Excel", value: "excel" },
                { label: "PDF", value: "pdf" },
              ]}
              placeholder="اختيار الصيغة"
              onChange={setExportFormat}
            />

            <MultiSelect
              label="الحقول"
              value={selectedFields}
              options={exportableFields}
              placeholder="اختيار الحقول"
              onChange={setSelectedFields}
              display="chip"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>الحد الأدنى للمعدل</label>
                <InputText value={noteMin} onChange={(e) => setNoteMin(e.target.value)} />
              </div>
              <div>
                <label>الحد الأقصى للمعدل</label>
                <InputText value={noteMax} onChange={(e) => setNoteMax(e.target.value)} />
              </div>
            </div>

            <MultiSelect
              label="المؤسسة"
              value={exportEcoles}
              options={ecolesOptions}
              placeholder="اختيار المؤسسة"
              onChange={setExportEcoles}
              display="chip"
              appendTo="body"
            />

            <MultiSelect
              label="المستوى"
              value={exportNiveaux}
              options={niveauxOptions}
              placeholder="اختيار المستوى"
              onChange={setExportNiveaux}
              display="chip"
              appendTo="body"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button size="sm" onClick={() => setExportDialogVisible(false)}>إغلاق</Button>
            <Button size="sm" onClick={handleExport}>تصدير</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
