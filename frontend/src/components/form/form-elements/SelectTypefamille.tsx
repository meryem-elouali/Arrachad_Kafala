import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import Input from "../input/InputField";

interface Option {
  value: string;
  label: string;
}
const handleSelect = (option: Option) => {
    setSelected(option);
    onChange(option.label); // <- envoyer le nom au backend
    setOpen(false);
};

const SelectTypefamille: React.FC<SelectTypefamille> = ({
  options = [],
  placeholder = "نوع الحالة",
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(null);
  const [opts, setOpts] = useState<Option[]>(options);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");

  const handleSelect = (option: Option) => {
    setSelected(option);
    onChange(option.value);
    setOpen(false);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const newOpt = { value: newOption.toLowerCase(), label: newOption };
    setOpts([...opts, newOpt]);
    setSelected(newOpt);
    onChange(newOpt.value);
    setNewOption("");
    setAdding(false);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <div
        className="border border-gray-300 rounded-lg px-4 py-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {selected ? selected.label : placeholder}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full border border-gray-300 rounded-lg bg-white shadow-lg max-h-60 overflow-auto">
          {opts?.map((opt) => (
            <div
              key={opt.value}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </div>
          ))}

          {!adding && (
            <div
              className="px-4 py-2 text-blue-600 cursor-pointer hover:bg-gray-100"
              onClick={() => setAdding(true)}
            >
              + Ajouter un type
            </div>
          )}

          {adding && (
            <div className="flex px-4 py-2 gap-2 items-center">
              <Input
                type="text"
                placeholder="Nouveau type"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
              />
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded flex items-center justify-center"
                onClick={handleAddOption}
              >
                <FaCheck />
              </button>
              <button
                className="px-3 py-1 bg-gray-300 text-black rounded flex items-center justify-center"
                onClick={() => setAdding(false)}
              >
                <FaTimes />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectTypefamille;
