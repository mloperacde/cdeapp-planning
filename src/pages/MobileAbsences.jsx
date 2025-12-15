import React from "react";
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";

export default function MobileAbsencesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        <UnifiedAbsenceManager sourceContext="mobile" />
      </div>
    </div>
  );
}