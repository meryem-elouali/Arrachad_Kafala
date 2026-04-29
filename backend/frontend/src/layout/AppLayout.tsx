import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppSidebar />
      <Backdrop />

      <main
        className={`min-h-screen transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:mr-[290px]" : "lg:mr-[90px]"
        } ${isMobileOpen ? "mr-0" : ""}`}
      >
        <div className="w-full p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;