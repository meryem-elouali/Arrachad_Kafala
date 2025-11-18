import { useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string, newOption?: boolean) => void;
  value?: string;
  allowAdd?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select...",
  onChange,
  value = "",
  allowAdd = false,
}) => {
  const [selectedValue, setSelectedValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState<Option[]>(options);
  const [newOption, setNewOption] = useState("");

  const handleSelect = (val: string) => {
    setSelectedValue(val);
    onChange(val);
    setOpen(false);
  };

  const handleAddOption = () => {
    if (newOption.trim() === "") return;
    const option = { value: newOption, label: newOption };
    setLocalOptions([...localOptions, option]);
    onChange(newOption, true);
    setSelectedValue(newOption);
    setNewOption("");
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        className="h-11 w-full rounded-lg border px-3 text-sm"
        value={selectedValue || newOption}
        placeholder={placeholder}
        onClick={() => setOpen(!open)}
        onChange={(e) => setNewOption(e.target.value)}
      />

      {open && (
        <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow max-h-60 overflow-y-auto">
          {localOptions.map((opt) => (
            <div
              key={opt.value}
              className="px-3 py-1 cursor-pointer hover:bg-gray-200"
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
          {allowAdd && newOption.trim() !== "" && !localOptions.some(o => o.value === newOption) && (
            <div
              className="px-3 py-1 cursor-pointer bg-blue-100 hover:bg-blue-200 text-blue-700"
              onClick={handleAddOption}
            >
              + Ajouter "{newOption}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Select;
