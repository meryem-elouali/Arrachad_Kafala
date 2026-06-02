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
import { Dialog } from "primereact/dialog";
import { Checkbox } from "primereact/checkbox";
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
const [exportDialog, setExportDialog] = useState(false);

const [exportOptions, setExportOptions] = useState({
  typeFamille: null,
  minEnfants: "",
  maxEnfants: "",
  fields: {
    nomFamille: true,
    nomCompletMere: true,
    nombreEnfants: true,
    typeFamilleNom: true,
  },
});
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
  <button
    className="view-btn"
    onClick={() => navigate(`/familleprofile/${rowData.id}`)}
  >
    عرض التفاصيل
  </button>
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
  let dataToExport = [...familles];

  if (exportOptions.typeFamille) {
    dataToExport = dataToExport.filter(
      (item: any) => item.typeFamilleNom === exportOptions.typeFamille
    );
  }

  if (exportOptions.minEnfants !== "") {
    dataToExport = dataToExport.filter(
      (item: any) => Number(item.nombreEnfants || 0) >= Number(exportOptions.minEnfants)
    );
  }

  if (exportOptions.maxEnfants !== "") {
    dataToExport = dataToExport.filter(
      (item: any) => Number(item.nombreEnfants || 0) <= Number(exportOptions.maxEnfants)
    );
  }

  const exportData = dataToExport.map((item: any) => {
    const row: any = {};

    if (exportOptions.fields.nomFamille) {
      row["اسم العائلة"] = `عائلة ${item.nomFamille}`;
    }

    if (exportOptions.fields.nomCompletMere) {
      row["اسم الأم الكامل"] = item.nomCompletMere;
    }

    if (exportOptions.fields.nombreEnfants) {
      row["عدد الأطفال"] = item.nombreEnfants;
    }

    if (exportOptions.fields.typeFamilleNom) {
      row["نوع العائلة"] = item.typeFamilleNom;
    }

    return row;
  });

  if (exportData.length === 0) {
    alert("لا توجد بيانات مطابقة للتصدير");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Familles");
  XLSX.writeFile(workbook, "familles.xlsx");

  setExportDialog(false);
};



return (
 <div className="family-page" dir="rtl">
    <div className="mx-auto max-w-7xl space-y-6">

    <div className="family-header-card">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
         <div className="family-badge-title">
              إدارة العائلات
            </div>

          <h1 className="family-title">
              قائمة العائلات
            </h1>

         <p className="family-subtitle">
              عرض، بحث، تصفية وتصدير بيانات العائلات بطريقة منظمة
            </p>
          </div>

        <Button
          icon="pi pi-file-excel"
          label="تصدير Excel"
          className="export-btn"
          onClick={() => setExportDialog(true)}
        />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="stat-card">
            <span>عدد العائلات</span>
            <strong>{familles.length}</strong>
          </div>

          <div className="stat-card">
            <span>إجمالي الأطفال</span>
            <strong>
              {familles.reduce((sum, f: any) => sum + Number(f.nombreEnfants || 0), 0)}
            </strong>
          </div>

          <div className="stat-card">
            <span>أنواع العائلات</span>
            <strong>{typesFamille.length}</strong>
          </div>
        </div>
      </div>

   <div className="family-table-card">
        <DataTable
          value={familles}
          paginator
          rows={10}
          loading={loading}
          filterDisplay="row"
          filters={filters}
          onFilter={(e) => setFilters(e.filters)}
          emptyMessage="لا توجد بيانات"
          stripedRows
          showGridlines={false}
          className="pro-family-table"
          tableStyle={{ minWidth: "900px" }}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          rowsPerPageOptions={[5, 10, 20, 50]}
        >
          <Column
            field="nomFamille"
            header="اسم العائلة"
            filter
            filterPlaceholder="بحث..."
            sortable
            showFilterMenu={false}
            body={(row) => (
              <div className="family-name">
                <span className="family-avatar">
                  {row.nomFamille?.charAt(0) || "ع"}
                </span>
                <span>عائلة {row.nomFamille}</span>
              </div>
            )}
          />

          <Column
            field="nomCompletMere"
            header="اسم الأم الكامل"
            filter
            filterPlaceholder="بحث..."
            sortable
            showFilterMenu={false}
          />

          <Column
            field="nombreEnfants"
            header="عدد الأطفال"
            filter
            filterElement={nombreEnfantsFilter}
            sortable
            showFilterMenu={false}
            body={(row) => <span className="children-badge">{row.nombreEnfants}</span>}
          />

          <Column
            field="typeFamilleNom"
            header="نوع العائلة"
            filter
            filterElement={typeFamilleFilter}
            sortable
            showFilterMenu={false}
            body={(row) => <span className="type-badge">{row.typeFamilleNom}</span>}
          />

          <Column
            body={actionBodyTemplate}
            header="الإجراء"
            style={{ width: "150px" }}
          />
        </DataTable>
      </div>
    </div>
    <Dialog
      header="خيارات التصدير"
      visible={exportDialog}
      onHide={() => setExportDialog(false)}
      style={{ width: "520px" }}
      dir="rtl"
      modal
    >
      <div className="space-y-5">

        <div>
          <label className="mb-2 block font-bold text-slate-700">
            نوع العائلة
          </label>
          <Dropdown
            value={exportOptions.typeFamille}
            options={typesFamille}
            onChange={(e) =>
              setExportOptions(prev => ({
                ...prev,
                typeFamille: e.value,
              }))
            }
            placeholder="كل الأنواع"
            showClear
            className="w-full"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-bold text-slate-700">
              أقل عدد أطفال
            </label>
            <InputText
              type="number"
              value={exportOptions.minEnfants}
              onChange={(e) =>
                setExportOptions(prev => ({
                  ...prev,
                  minEnfants: e.target.value,
                }))
              }
              placeholder="مثلا 1"
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold text-slate-700">
              أكبر عدد أطفال
            </label>
            <InputText
              type="number"
              value={exportOptions.maxEnfants}
              onChange={(e) =>
                setExportOptions(prev => ({
                  ...prev,
                  maxEnfants: e.target.value,
                }))
              }
              placeholder="مثلا 5"
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="mb-3 block font-bold text-slate-700">
            الحقول المراد تصديرها
          </label>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["nomFamille", "اسم العائلة"],
              ["nomCompletMere", "اسم الأم الكامل"],
              ["nombreEnfants", "عدد الأطفال"],
              ["typeFamilleNom", "نوع العائلة"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  checked={exportOptions.fields[key]}
                  onChange={(e) =>
                    setExportOptions(prev => ({
                      ...prev,
                      fields: {
                        ...prev.fields,
                        [key]: e.checked,
                      },
                    }))
                  }
                />
                <span className="font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            label="إلغاء"
            className="p-button-text"
            onClick={() => setExportDialog(false)}
          />

          <Button
            label="تصدير"
            icon="pi pi-download"
            className="export-btn"
            onClick={handleExport}
          />
        </div>
      </div>
    </Dialog>
  </div>
);
}
