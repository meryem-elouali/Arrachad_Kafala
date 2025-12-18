import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function FamillesTable() {
  const [familles, setFamilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:8080/api/famille')
      .then(res => {
        const data = res.data.map(famille => ({
          ...famille,
          nomFamille: famille.pere?.nom || famille.mere?.nom || '—',
          nomCompletMere: famille.mere ? `${famille.mere.nom} ${famille.mere.prenom}` : '—',
          nombreEnfants: famille.nombreEnfants || 0,
          typeFamilleNom: famille.typeFamille?.nom || '—'
        }));
        setFamilles(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const actionBodyTemplate = (rowData: any) => {
    return (
      <Button
        label="Voir"
        icon="pi pi-eye"
        className="p-button-info"
        onClick={() => navigate(`/familleprofile/${rowData.id}`)}
      />
    );
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">📋 Liste des familles</h1>

      <DataTable
        value={familles}
        paginator
        rows={10}
        loading={loading}
        responsiveLayout="scroll"
        className="p-datatable-striped p-datatable-gridlines"
      >
        <Column field="nomFamille" header="Nom de famille" sortable style={{ textAlign: 'right' }}/>
        <Column field="nomCompletMere" header="Nom complet mère" sortable style={{ textAlign: 'right' }}/>
        <Column field="nombreEnfants" header="Nombre d'enfants" sortable style={{ textAlign: 'center' }}/>
        <Column field="typeFamilleNom" header="Type de famille" sortable style={{ textAlign: 'right' }}/>
        <Column body={actionBodyTemplate} header="Action" style={{ textAlign: 'center', width: '120px' }}/>
      </DataTable>
    </div>
  );
}
