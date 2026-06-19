import { useEffect, useState } from "react";
import ComponentCard from "../components/common/ComponentCard";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";

export default function DegreFamillePage() {
  const [degre, setDegre] = useState<any>({
    pointParEnfant: 0,
    pointEnfantMalade: 0,

    pointHabitationPropriete: 0,
    pointHabitationRahn: 0,
    pointHabitationLoyer: 0,

    pointMereTravailleOui: 0,
    pointMereTravailleNon: 0,

    pointMereMaladeOui: 0,
    pointMereMaladeNon: 0,

    pointAideFamilleOui: 0,
    pointAideFamilleNon: 0,

    pointRevenuMensuelOui: 0,
    pointRevenuMensuelNon: 0,

    pointAutreAssociationOui: 0,
    pointAutreAssociationNon: 0,

    pointPossedeMaladeOui: 0,
    pointPossedeMaladeNon: 0,
  });

  useEffect(() => {
    fetch("http://localhost:8080/api/degre-famille")
      .then((res) => res.json())
      .then((data) => setDegre(data))
      .catch((err) => console.error(err));
  }, []);

  const handleChange = (field: string, value: string) => {
    setDegre({
      ...degre,
      [field]: Number(value),
    });
  };

  const saveDegre = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/degre-famille", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(degre),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'enregistrement");
      }

      alert("تم حفظ النقط بنجاح");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const Field = ({ label, name }: any) => (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        value={degre[name] ?? 0}
        onChange={(e) => handleChange(name, e.target.value)}
        className="border p-2 rounded w-full"
      />
    </div>
  );

  return (
    <div dir="rtl" className="space-y-6">
      <ComponentCard title={<span className="font-bold">درجات العائلة</span>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Field label="نقطة لكل ابن" name="pointParEnfant" />
          <Field label="نقطة لكل ابن مريض" name="pointEnfantMalade" />

          <Field label="نقطة السكن: ملك" name="pointHabitationPropriete" />
          <Field label="نقطة السكن: رهن" name="pointHabitationRahn" />
          <Field label="نقطة السكن: كراء" name="pointHabitationLoyer" />

          <Field label="الأم تعمل: نعم" name="pointMereTravailleOui" />
          <Field label="الأم تعمل: لا" name="pointMereTravailleNon" />

          <Field label="الأم مريضة: نعم" name="pointMereMaladeOui" />
          <Field label="الأم مريضة: لا" name="pointMereMaladeNon" />

          <Field label="مساعدة العائلة: نعم" name="pointAideFamilleOui" />
          <Field label="مساعدة العائلة: لا" name="pointAideFamilleNon" />

          <Field label="دخل مالي شهري: نعم" name="pointRevenuMensuelOui" />
          <Field label="دخل مالي شهري: لا" name="pointRevenuMensuelNon" />

          <Field label="تستفيد من جمعية أخرى: نعم" name="pointAutreAssociationOui" />
          <Field label="تستفيد من جمعية أخرى: لا" name="pointAutreAssociationNon" />

          <Field label="تعتني بشخص مريض في المنزل: نعم" name="pointPossedeMaladeOui" />
          <Field label="تعتني بشخص مريض في المنزل: لا" name="pointPossedeMaladeNon" />

        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={saveDegre}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl"
          >
            حفظ النقط
          </button>
        </div>
      </ComponentCard>
    </div>
  );
}