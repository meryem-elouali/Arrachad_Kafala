import React, { useState, useEffect } from 'react';
import { FilterMatchMode } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputIcon } from 'primereact/inputicon';
import axios from 'axios';

import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primeicons/primeicons.css';
import './EtudesTable.css';

export default function EtudesTable() {
    const [etudes, setEtudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        niveauNom: { value: null, matchMode: FilterMatchMode.EQUALS },
        nomEcole: { value: null, matchMode: FilterMatchMode.EQUALS },
        anneeScolaire: { value: null, matchMode: FilterMatchMode.EQUALS }
    });

    const [niveauxOptions, setNiveauxOptions] = useState([]);
    const [ecolesOptions, setEcolesOptions] = useState([]);
    const [anneesOptions, setAnneesOptions] = useState([]);

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

                // Générer les options uniques pour les Dropdowns
                const niveaux = [...new Set(data.map(d => d.niveauNom))];
                const ecoles = [...new Set(data.map(d => d.nomEcole))];
                const annees = [...new Set(data.map(d => d.anneeScolaire))];

                setNiveauxOptions(niveaux.map(n => ({ label: n, value: n })));
                setEcolesOptions(ecoles.map(e => ({ label: e, value: e })));
                setAnneesOptions(annees.map(a => ({ label: a, value: a })));

                setEtudes(data);
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

    // Templates pour les colonnes Dropdown Filter
    const niveauFilterTemplate = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={niveauxOptions}
                onChange={(e) => options.filterCallback(e.value)}
                placeholder="اختيار المستوى"
                showClear
            />
        );
    };

    const ecoleFilterTemplate = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={ecolesOptions}
                onChange={(e) => options.filterCallback(e.value)}
                placeholder="اختيار المؤسسة"
                showClear
            />
        );
    };

    const anneeFilterTemplate = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={anneesOptions}
                onChange={(e) => options.filterCallback(e.value)}
                placeholder="اختيار السنة"
                showClear
            />
        );
    };

    const header = (
        <div className="table-header">
            <h3>جدول الدراسات</h3>
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="ابحث هنا..."
                />
            </span>
        </div>
    );

    return (
        <div className="card etudes-table">
            <DataTable
                dir="RTL"
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
                className="p-datatable-striped p-datatable-gridlines"
            >
                <Column field="nomEnfant" header="الاسم الكامل" filter filterPlaceholder="بحث بالاسم" sortable />
                <Column field="niveauNom" header="المستوى" filter filterElement={niveauFilterTemplate} sortable />
                <Column field="nomEcole" header="المؤسسة" filter filterElement={ecoleFilterTemplate} sortable />
                <Column field="anneeScolaire" header="السنة الدراسية" filter filterElement={anneeFilterTemplate} sortable />
                <Column field="noteSemestre1" header="معدل النجاح" sortable />
            </DataTable>
        </div>
    );
}
