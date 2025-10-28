import { useState } from "react";
import Input from "../input/InputField";
import Label from "../Label";

interface BirthDateInputProps {
  id: string;
  label?: string;
}

export default function BirthDateInput({ id, label = "تاريخ الازدياد" }: BirthDateInputProps) {
  const [value, setValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ""); // garder seulement les chiffres
    if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
    if (val.length > 10) val = val.slice(0, 10);
    setValue(val);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Label htmlFor={id}>{label}</Label>
      <Input
        type="text"
        id={id}
        placeholder="__/__/____"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
