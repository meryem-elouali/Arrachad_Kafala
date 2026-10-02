import React from "react";
import GridShape from "../../components/common/GridShape";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-white z-1 dark:bg-gray-900">
      <div className="relative flex h-screen w-full flex-col justify-center lg:flex-row dark:bg-gray-900">
        {children}

        <div dir="rtl" className="hidden h-full w-full items-center bg-brand-950 dark:bg-white/5 lg:grid lg:w-1/2">
          <div className="relative z-1 flex items-center justify-center">
            <GridShape />
            <div className="flex max-w-sm flex-col items-center text-center">
              <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-4xl font-extrabold text-white backdrop-blur">
                ر
              </span>
              <h2 className="text-3xl font-extrabold text-white">الرشاد للكفالة</h2>
              <p className="mt-3 text-white/60">
                نظام تدبير العائلات والأنشطة والتتبع الدراسي، واجتماعات اللجنة الاجتماعية.
              </p>
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 left-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}