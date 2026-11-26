import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const QrHubPage: React.FC = () => {
  const { institutions, departments } = useAuth();

  const [instId, setInstId] = useState(institutions[0]?.id || '');
  const [deptId, setDeptId] = useState('');
  const [roomLabel, setRoomLabel] = useState('Block-A · Computer Lab 204');

  const filteredDepts = useMemo(
    () => departments.filter((d) => d.institution_id === (instId || institutions[0]?.id)),
    [departments, instId, institutions]
  );

  const activeInstId = instId || institutions[0]?.id || '';
  const activeDeptId = deptId || filteredDepts[0]?.id || '';

  const qrUrl = `${window.location.origin}/tickets/new?inst=${encodeURIComponent(
    activeInstId
  )}&dept=${encodeURIComponent(activeDeptId)}&loc=${encodeURIComponent(roomLabel)}`;

  const selectedInst = institutions.find((i) => i.id === activeInstId);
  const selectedDept = filteredDepts.find((d) => d.id === activeDeptId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <QrCode className="w-6 h-6 text-brand-600" />
          <span>Campus QR Maintenance Stickers</span>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Generate scan-to-report QR codes for classrooms, labs, hostels, and campus facilities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configurator */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-apple-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">1. Configure Location Tag</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institution / College
            </label>
            <select
              value={activeInstId}
              onChange={(e) => {
                setInstId(e.target.value);
                setDeptId('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Target Department
            </label>
            <select
              value={activeDeptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {filteredDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Room / Lab / Asset Location Label
            </label>
            <input
              type="text"
              value={roomLabel}
              onChange={(e) => setRoomLabel(e.target.value)}
              placeholder="e.g. Main Building · Seminar Hall 1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print QR Poster
            </button>
            <a
              href={qrUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Test Scan Link
            </a>
          </div>
        </div>

        {/* Printable Poster Preview */}
        <div className="bg-white rounded-3xl border-2 border-slate-900 p-7 shadow-apple-md flex flex-col items-center text-center justify-between space-y-4">
          <div className="w-full pb-3 border-b border-slate-200">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-600 text-white text-[11px] font-bold tracking-wide">
              D. Y. PATIL GROUP SERVICE DESK
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-2">{selectedInst?.name}</h3>
            <p className="text-xs font-semibold text-brand-600 mt-0.5">{roomLabel}</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200">
            <QRCodeSVG value={qrUrl} size={170} level="M" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">
              Scan to Report Wi-Fi, Electrical, or Facility Issue
            </p>
            <p className="text-[11px] text-slate-400">
              Auto-routes to {selectedDept?.name || 'Campus Support'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};