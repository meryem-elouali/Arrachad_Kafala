import React, { useState, useCallback } from "react";
import ComponentCard from "../../common/ComponentCard";
import { useDropzone } from "react-dropzone";

interface DropzoneProps {
  label: string;
  id: string;
  onFileSelect: (file: File) => void;
}

const DropzoneComponent: React.FC<DropzoneProps> = ({ label, id, onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles[0]) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file)); // ✅ génère l’aperçu local
        onFileSelect(file); // ✅ transmet au parent
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
      "image/svg+xml": [],
    },
    multiple: false,
  });

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <ComponentCard title={label}>
      {!selectedFile ? (
        // --- ✅ DROPZONE quand aucune image sélectionnée ---
        <div
          {...getRootProps()}
          className={`transition border border-dashed cursor-pointer rounded-xl p-7 lg:p-10
            ${isDragActive
              ? "border-brand-500 bg-gray-100 dark:bg-gray-800"
              : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            } hover:border-brand-500`}
        >
          <input {...getInputProps()} />
          <div className="dz-message flex flex-col items-center text-center">
            <div className="mb-5 flex justify-center">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                <svg
                  className="fill-current text-gray-600 dark:text-gray-400"
                  width="29"
                  height="28"
                  viewBox="0 0 29 28"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M14.5 3.9C8.9 3.9 4.4 8.4 4.4 14C4.4 19.6 8.9 24.1 14.5 24.1C20.1 24.1 24.6 19.6 24.6 14C24.6 8.4 20.1 3.9 14.5 3.9ZM13.2 10.5H15.8V14H18.5L14.5 18L10.5 14H13.2V10.5Z"/>
                </svg>
              </div>
            </div>
            <h4 className="mb-3 font-semibold text-gray-800 text-lg dark:text-white">
              {isDragActive ? "Déposez l’image ici" : "Glissez une image ou cliquez"}
            </h4>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              PNG, JPG, WebP, SVG acceptés
            </span>
            <span className="font-medium underline text-brand-500 mt-2">
              Parcourir un fichier
            </span>
          </div>
        </div>
      ) : (
        // --- ✅ APERÇU de l’image sélectionnée ---
        <div className="flex flex-col items-center">
          <img
            src={previewUrl || ""}
            alt="Aperçu"
            className="max-h-[250px] rounded-xl shadow-md object-cover mb-4"
          />
          <button
            onClick={handleRemoveImage}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            Changer d’image
          </button>
        </div>
      )}
    </ComponentCard>
  );
};

export default DropzoneComponent;
