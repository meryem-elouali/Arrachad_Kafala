import React, { useCallback } from "react";
import ComponentCard from "../../common/ComponentCard";
import { Accept, useDropzone } from "react-dropzone";

interface DropzoneProps {
  label: string;
  id: string;
  onFileSelect: (file: File | File[]) => void;
  accept?: Accept;
  multiple?: boolean;
}

const DropzoneComponent1: React.FC<DropzoneProps> = ({
  label,
  id,
  onFileSelect,
  accept,
  multiple = true,
}) => {
  const defaultAccept: Accept = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      if (multiple) {
        onFileSelect(acceptedFiles);
      } else {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [multiple, onFileSelect]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    multiple,
    accept: accept || defaultAccept,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <ComponentCard title={label}>
      <div dir="rtl">

        <div
          {...getRootProps()}
          className={`
            group relative overflow-hidden
            rounded-2xl border-2 border-dashed
            px-6 py-10
            cursor-pointer
            transition-all duration-300

            ${
              isDragReject
                ? "border-red-400 bg-red-50/60"
                : isDragActive
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : `
                    border-gray-200
                    bg-gradient-to-b from-white to-gray-50/70
                    hover:border-blue-400
                    hover:bg-blue-50/30
                    hover:shadow-sm
                    dark:border-gray-700
                    dark:from-gray-900
                    dark:to-gray-900
                  `
            }
          `}
        >
          <input {...getInputProps({ id })} />

          <div className="flex flex-col items-center justify-center text-center">

            {/* Upload icon */}
            <div
              className={`
                mb-5 flex h-16 w-16
                items-center justify-center
                rounded-2xl
                transition-all duration-300

                ${
                  isDragReject
                    ? "bg-red-100 text-red-500"
                    : isDragActive
                    ? "scale-110 bg-blue-100 text-blue-600"
                    : `
                        bg-blue-50 text-blue-600
                        group-hover:scale-105
                        group-hover:bg-blue-100
                      `
                }
              `}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M20 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
              </svg>
            </div>

            {/* Main title */}
            <h3
              className={`
                text-base font-bold
                ${
                  isDragReject
                    ? "text-red-600"
                    : "text-gray-800 dark:text-white"
                }
              `}
            >
              {isDragReject
                ? "نوع الملف غير مدعوم"
                : isDragActive
                ? "أفلت الملفات هنا"
                : "اسحب الملفات وأفلتها هنا"}
            </h3>

            {/* Subtitle */}
            {!isDragReject && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                أو اضغط لاختيار الملفات من جهازك
              </p>
            )}

            {/* Select button */}
            {!isDragReject && !isDragActive && (
              <div
                className="
                  mt-5 inline-flex items-center gap-2
                  rounded-xl bg-blue-600
                  px-5 py-2.5
                  text-sm font-semibold text-white
                  shadow-sm
                  transition-all duration-200
                  group-hover:bg-blue-700
                  group-hover:shadow-md
                "
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>

                اختيار الملفات
              </div>
            )}

            {/* Error */}
            {isDragReject && (
              <p className="mt-3 text-sm text-red-500">
                يرجى اختيار صورة أو ملف PDF أو Word أو Excel
              </p>
            )}

            {/* Supported formats */}
            {!isDragReject && (
              <>
                <div className="my-6 h-px w-full max-w-md bg-gray-100 dark:bg-gray-800" />

                <div className="flex flex-wrap items-center justify-center gap-2">

                  <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500">
                    JPG
                  </span>

                  <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500">
                    PNG
                  </span>

                  <span className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500">
                    PDF
                  </span>

                  <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
                    DOC
                  </span>

                  <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
                    DOCX
                  </span>

                  <span className="rounded-lg border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
                    XLS
                  </span>

                  <span className="rounded-lg border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
                    XLSX
                  </span>

                </div>

                <p className="mt-4 text-xs text-gray-400">
                  الحد الأقصى لحجم الملف الواحد 50 MB
                </p>
              </>
            )}

          </div>
        </div>

      </div>
    </ComponentCard>
  );
};

export default DropzoneComponent1;