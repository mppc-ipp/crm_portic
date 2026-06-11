"use client";

import NotificationCenter from "@/components/reports/NotificationCenter";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Centro de notificações do CRM Portic.</p>
      </div>

      <NotificationCenter />
    </div>
  );
}
