import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { History, ShieldCheck, Clock, User, Download, Filter } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { activityLogs } = usePharmacy();

  const handleExportCsv = () => {
    const headers = 'ID,Timestamp,Action,User,Details\n';
    const rows = activityLogs.map(l => `"${l.id}","${l.timestamp}","${l.action}","${l.user}","${l.details.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmpulse-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div id="audit-logs-view" className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600" />
              <span>Pharmacy Audit Trail & Regulatory Logs</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
              HIPAA & DEA Title 21 CFR Part 1311 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable system logs documenting prescription verifications, dispense releases, inventory adjustments, and patient interactions.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-3">Pharmacist / User</th>
                <th className="py-3.5 px-3">Action Event</th>
                <th className="py-3.5 px-4">Audit Details & Record Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      {log.user}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-slate-100 text-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 leading-relaxed font-medium">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
