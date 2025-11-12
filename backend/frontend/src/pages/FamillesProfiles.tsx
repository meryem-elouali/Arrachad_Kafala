import { useState, useEffect } from "react";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { Modal } from "../components/ui/modal";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";

interface Enfant {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance: string;
  photoEnfant?: number[];
}

interface Famille {
  id: number;
  nomFamille: string;
  adresseFamille:string;
  phone: string;
  mere?: { nom: string; prenom: string;photoMere?: number[];  };
  pere?: { nom: string; prenom: string;photoPere?: number[];  };
  typeFamille?: { nom: string };
  enfants?: Enfant[];
  niveauScolaire?: { nom: string };
}
export default function FamillesProfiles() {
 const [modalType, setModalType] = useState<null | "personal" | "address">(null);
  const [famille, setFamille] = useState<Famille | null>(null);

  const openModal = (type: "personal" | "address") => setModalType(type);
  const closeModal = () => setModalType(null);

 function toBase64(byteArray?: number[]): string | undefined {
   if (!byteArray) return undefined;
   const uint8Array = new Uint8Array(byteArray);
   let binary = '';
   for (let i = 0; i < uint8Array.byteLength; i++) {
     binary += String.fromCharCode(uint8Array[i]);
   }
   return `data:image/jpeg;base64,${btoa(binary)}`;
 }



useEffect(() => {
    const fetchFamille = async () => {
      try {
        const urlParts = window.location.pathname.split("/").filter(Boolean);
        const id = Number(urlParts[urlParts.length - 1]);
        if (isNaN(id)) return;

        const res = await fetch(`http://localhost:8080/api/famille/${id}`);
        if (!res.ok) return;

        const data: Famille = await res.json();
        setFamille(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFamille();
  }, []);

  if (!famille) return <p>Chargement...</p>;
  const handleSave = () => {
    console.log("Saving changes...");
    closeModal();
  };
   const renderModalContent = () => {
      if (modalType === "personal") {
        return (
          <>
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <form className="flex flex-col">
              <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>First Name</Label>
                    <Input type="text" value="Musharof" />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input type="text" value="Chowdhury" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="text" value="randomuser@pimjo.com" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input type="text" value="+09 363 398 46" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button size="sm" variant="outline" onClick={closeModal}>
                  Close
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </form>
          </>
        );
      }

      if (modalType === "address") {
        return (
          <>
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Address
            </h4>
            <form className="flex flex-col">
              <div className="px-2 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>Country</Label>
                    <Input type="text" value="United States" />
                  </div>
                  <div>
                    <Label>City/State</Label>
                    <Input type="text" value="Arizona, United States." />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input type="text" value="ERT 2489" />
                  </div>
                  <div>
                    <Label>TAX ID</Label>
                    <Input type="text" value="AS4568384" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button size="sm" variant="outline" onClick={closeModal}>
                  Close
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </form>
          </>
        );
      }

      return null;
    };
  return (
    <>
      <PageMeta
        title="React.js Profile Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Profile" />
      <div  dir="rtl" className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                      <div className="flex gap-4">
                           {famille.pere?.photoPere && (
                             <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100">
                               <img
                                 src={`data:image/jpeg;base64,${famille.pere.photoPere}`}
                                 alt="Père"
                                 className="w-full h-full object-cover"
                               />
                             </div>
                           )}

                           {/* Image de la mère */}
                       {famille.mere?.photoMere && (
                         <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100">
                           <img
                             src={`data:image/jpeg;base64,${famille.mere.photoMere}`}
                             alt="Père"
                             className="w-full h-full object-cover"
                           />
                         </div>
                       )}
{/* Images des enfants */}
{famille.enfants &&
  famille.enfants
    .filter((enfant) => enfant.photoEnfant) // 👈 garde seulement ceux qui ont une photo
    .map((enfant, index) => (
      <div
        key={index}
        className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-100"
      >
        <img
          src={`data:image/jpeg;base64,${enfant.photoEnfant}`}
          alt={enfant.prenom}
          className="w-full h-full object-cover"
        />
      </div>
    ))}


                         </div>
                      <div className="order-3 xl:order-2">
                        <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                         عائلة {famille.pere ? `${famille.pere.nom} ` : "N/A"}
                        </h4>
                        <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                           {famille.typeFamille ? `${famille.typeFamille.nom} ` : "N/A"}
                          </p>
                          <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                      {famille.adresseFamille ? `${famille.adresseFamille}` : "N/A"}

                          </p>
                        </div>
                      </div>

                    </div>
                    <button

              onClick={() => openModal("address")}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                    >
                      <svg
                        className="fill-current"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                          fill=""
                        />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>

       <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h4>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      First Name
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      Musharof
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Last Name
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      Chowdhury
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Email address
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      randomuser@pimjo.com
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Phone
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      +09 363 398 46
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      Bio
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      Team Manager
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={openModal}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
              >
                <svg
                  className="fill-current"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                    fill=""
                  />
                </svg>
                Edit
              </button>
            </div>


          </div>
          <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
               <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                 <div>
                   <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                     Address
                   </h4>

                   <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                     <div>
                       <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                         Country
                       </p>
                       <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                         United States.
                       </p>
                     </div>

                     <div>
                       <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                         City/State
                       </p>
                       <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                         Phoenix, Arizona, United States.
                       </p>
                     </div>

                     <div>
                       <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                         Postal Code
                       </p>
                       <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                         ERT 2489
                       </p>
                     </div>

                     <div>
                       <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                         TAX ID
                       </p>
                       <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                         AS4568384
                       </p>
                     </div>
                   </div>
                 </div>

                 <button
                   onClick={openModal}
                   className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                 >
                   <svg
                     className="fill-current"
                     width="18"
                     height="18"
                     viewBox="0 0 18 18"
                     fill="none"
                     xmlns="http://www.w3.org/2000/svg"
                   >
                     <path
                       fillRule="evenodd"
                       clipRule="evenodd"
                       d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                       fill=""
                     />
                   </svg>
                   Edit
                 </button>
               </div>
             </div>

        </div>
      </div>
      <Modal isOpen={modalType !== null} onClose={closeModal} className="max-w-[700px] m-4">
              <div className="no-scrollbar w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                {renderModalContent()}
              </div>
            </Modal>

    </>
  );
}
