import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import BirthDateInput from "./BirthDateInput";
import DropzoneComponent from "./DropZone";

export default function InfosMere() {
  const [estMalade, setEstMalade] = useState(false);
  const [estTravaille, setEstTravaille] = useState(false);
  const [estDecedee, setEstDecedee] = useState(false);

  return (
    <ComponentCard title="معلومات الأب">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Checkbox Mère décédée */}
        <div className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            id="decedee"
            checked={estDecedee}
            onChange={() => setEstDecedee(!estDecedee)}
          />
          <Label htmlFor="decedee">الأب متوفي</Label>
        </div>
 <div className="flex flex-col">
              <Label htmlFor="input1">الاسم</Label>
              <Input type="text" id="input1" />
            </div>

            {/* Prénom */}
            <div className="flex flex-col">
              <Label htmlFor="input2">النسب</Label>
              <Input type="text" id="input2" />
            </div>
        {/* Si mère décédée, afficher seulement date de décès */}
        {estDecedee ? (
          <div className="flex flex-col mt-2 md:col-span-2">
            <BirthDateInput id="birthDateMereDecedee" label="تاريخ وفاة الأب" />
          </div>
        ) : (
          <>
            {/* Nom */}


            {/* CIN */}
            <div className="flex flex-col">
              <Label htmlFor="cin">رقم البطاقة الوطنية</Label>
              <Input type="text" id="cin" placeholder="12345678" />
            </div>

            {/* Téléphone */}
            <div className="flex flex-col">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input type="text" id="phone" placeholder="06 12 34 56 78" />
            </div>

            {/* Date de naissance */}
            <BirthDateInput id="birthDateMere" label="تاريخ ازدياد الأم" />

            {/* Ville de naissance */}
            <div className="flex flex-col">
              <Label htmlFor="villeNaissance">مكان الازدياد</Label>
              <Input type="text" id="villeNaissance" placeholder="مكان الازدياد" />
            </div>

            {/* Checkbox Mère malade */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="malade"
                checked={estMalade}
                onChange={() => setEstMalade(!estMalade)}
              />
              <Label htmlFor="malade">الأم مريضة</Label>
            </div>

            {/* Type de maladie si malade */}
            {estMalade && (
              <div className="flex flex-col">
                <Label htmlFor="typeMaladie">نوع المرض</Label>
                <Input type="text" id="typeMaladie" placeholder="ادخل نوع المرض" />
              </div>
            )}

            {/* Checkbox Mère travaille */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="travaille"
                checked={estTravaille}
                onChange={() => setEstTravaille(!estTravaille)}
              />
              <Label htmlFor="travaille">الأب يعمل</Label>
            </div>

            {/* Type de travail si travaille */}
            {estTravaille && (
              <div className="flex flex-col">
                <Label htmlFor="typeTravail">نوع العمل</Label>
                <Input type="text" id="typeTravail" placeholder="ادخل نوع العمل" />
              </div>
            )}
             <div className="md:col-span-2 mt-4">
                      <DropzoneComponent label="صورة الأب" id="photoMere" />
                    </div>
          </>
        )}

        {/* Photo */}


      </div>
    </ComponentCard>
  );
}
