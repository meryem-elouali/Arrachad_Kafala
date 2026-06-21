import React, { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { FilterMatchMode } from "primereact/api";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function FamillesTable() {
  const [familles, setFamilles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typesFamille, setTypesFamille] = useState<any[]>([]);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    nomFamille: { value: null, matchMode: FilterMatchMode.CONTAINS },
    nomsEnfants: { value: null, matchMode: FilterMatchMode.CONTAINS },
    nomCompletMere: { value: null, matchMode: FilterMatchMode.CONTAINS },
    nombreEnfants: { value: null, matchMode: FilterMatchMode.EQUALS },
    typeFamilleNom: { value: null, matchMode: FilterMatchMode.EQUALS },
    degreFamille: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/famille")
      .then((res) => {
        const data = res.data.map((famille: any) => ({
          ...famille,
          nomFamille: famille.pere?.nom || famille.mere?.nom || "—",
          nomCompletMere: famille.mere
            ? `${famille.mere.nom} ${famille.mere.prenom}`
            : "—",
          nombreEnfants: Number(famille.nombreEnfants || 0),
          typeFamilleNom: famille.typeFamille?.nom || "—",



          degreFamille:
            famille.degreFamille?.nom ||
            famille.degreFamille ||
            famille.degre ||
            "غير محددة",
        }));

        setFamilles(data);

        const uniqueTypes = [
          ...new Set(data.map((f: any) => f.typeFamilleNom).filter((t) => t && t !== "—")),
        ].map((t) => ({ label: t, value: t }));

        setTypesFamille(uniqueTypes);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const typeFamilleFilter = () => (
    <Dropdown
      value={filters.typeFamilleNom?.value ?? null}
      options={typesFamille}
      onChange={(e) =>
        setFilters((prev: any) => ({
          ...prev,
          typeFamilleNom: {
            ...prev.typeFamilleNom,
            value: e.value ?? null,
          },
        }))
      }
      placeholder="نوع العائلة"
      className="p-column-filter"
      showClear
      optionLabel="label"
      optionValue="value"
    />
  );

  const nombreEnfantsFilter = () => (
    <InputText
      type="number"
      value={filters.nombreEnfants?.value ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        setFilters((prev: any) => ({
          ...prev,
          nombreEnfants: {
            ...prev.nombreEnfants,
            value: val !== "" ? Number(val) : null,
          },
        }));
      }}
      placeholder="عدد الأطفال"
      className="p-column-filter"
    />
  );

 const actionBodyTemplate = (rowData: any) => (
   <button
     className="eye-action-btn"
     title="عرض التفاصيل"
     onClick={() => navigate(`/familleprofile/${rowData.id}`)}
   >
     <i className="pi pi-eye"></i>
   </button>
 );

  return (
    <div className="family-page" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="family-header-card">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="family-badge-title">إدارة العائلات</div>

              <h1 className="family-title">قائمة العائلات</h1>

              <p className="family-subtitle">
                عرض، بحث، تصفية وتتبع بيانات العائلات بطريقة منظمة
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="stat-card">
              <span>عدد العائلات</span>
              <strong>{familles.length}</strong>
            </div>

            <div className="stat-card">
              <span>إجمالي الأطفال</span>
              <strong>
                {familles.reduce(
                  (sum: number, f: any) => sum + Number(f.nombreEnfants || 0),
                  0
                )}
              </strong>
            </div>

            <div className="stat-card">
              <span>أنواع العائلات</span>
              <strong>{typesFamille.length}</strong>
            </div>

            <div className="stat-card">
              <span>درجات غير محددة</span>
              <strong>
                {
                  familles.filter(
                    (f: any) => f.degreFamille === "غير محددة"
                  ).length
                }
              </strong>
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
            className="pro-family-table"
            tableStyle={{ minWidth: "1100px" }}
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
              body={(row) => (
                <span className="children-badge">
                  {row.nombreEnfants}
                </span>
              )}
            />

            <Column
              field="typeFamilleNom"
              header="نوع العائلة"
              filter
              filterElement={typeFamilleFilter}
              sortable
              showFilterMenu={false}
              body={(row) => (
                <span className="type-badge">
                  {row.typeFamilleNom}
                </span>
              )}
            />

            <Column
              field="degreFamille"
              header="درجة الأسرة"
              filter
              filterPlaceholder="بحث..."
              sortable
              showFilterMenu={false}
              body={(row) => (
                <span className="degre-badge">
                  {row.degreFamille}
                </span>
              )}
            />

            <Column
              body={actionBodyTemplate}
              header="الإجراء"
              style={{ width: "160px" }}
            />
          </DataTable>
        </div>
      </div>
    </div>
  );
}