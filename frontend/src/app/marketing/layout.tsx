"use client";

import MarketingSubNav from "@/components/marketing/MarketingSubNav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Marketing</h1>
      <p className="mb-4 text-sm text-slate-600">
        Planeamento e publicação em Facebook, Instagram e LinkedIn.
      </p>
      <MarketingSubNav />
      {children}
    </div>
  );
}
