import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import BirthDateInput from "./BirthDateInput";
import DropzoneComponent from "./DropZone";
import SelectNiveauEnfant from "./SelectNiveauEnfant";
import SelectEcoleEnfant from "./SelectEcoleEnfant";
export default function InfosEnfant() {
  const [estMalade, setEstMalade] = useState(false);
  const [estTravaille, setEstTravaille] = useState(false);
  const [estDecedee, setEstDecedee] = useState(false);

  return (
    <ComponentCard title="معلومات الابن">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

 <div className="flex flex-col">
              <Label htmlFor="input1">الاسم</Label>
              <Input type="text" id="input1" />
            </div>

            {/* Prénom */}
            <div className="flex flex-col">
              <Label htmlFor="input2">النسب</Label>
              <Input type="text" id="input2" />
            </div>
             <BirthDateInput id="birthDateEnfant" label="تاريخ ازدياد الطفل" />

                        {/* Ville de naissance */}
                        <div className="flex flex-col">
                          <Label htmlFor="villeNaissance">مكان الازدياد</Label>
                          <Input type="text" id="villeNaissance" placeholder="مكان الازدياد" />
                        </div>
        {/* Checkbox Mère décédée */}

        {/* Si mère décédée, afficher seulement date de décès */}




            {/* Checkbox Mère malade */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="malade"
                checked={estMalade}
                onChange={() => setEstMalade(!estMalade)}
              />
              <Label htmlFor="malade">هل يعاني من مرض</Label>
            </div>

            {/* Type de maladie si malade */}
            {estMalade && (
              <div className="flex flex-col">
                <Label htmlFor="typeMaladie">نوع المرض</Label>
                <Input type="text" id="typeMaladie" placeholder="ادخل نوع المرض" />
              </div>
            )}

            {/* Checkbox Mère travaille */}
  <div className="md:col-span-2 mt-4">
                  <SelectEcoleEnfant
                    options={[{ value: "1", label: "Option 1" }]}
                    onChange={(val) => {
                      console.log("Option sélectionnée :", val);
                    }}
                  />

                  </div>

           <div className="md:col-span-2 mt-4">
                  <SelectNiveauEnfant
                    options={[{ value: "1", label: "Option 1" }]}
                    onChange={(val) => {
                      console.log("Option sélectionnée :", val);
                    }}
                  />

                  </div>
         <div className="md:col-span-2 mt-4">
                       <DropzoneComponent label="صورة الاين" id="photoEnfant" />
                     </div>


      </div>
    </ComponentCard>
  );
}
