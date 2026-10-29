'use client';

import React, { useState } from 'react';
import { ActiveUser, AuditLog, PharmacySettings } from '@/types/pharmacy';
import {
  Settings,
  ShieldCheck,
  Building,
  Printer,
  History,
  Download,
  Upload,
  RefreshCw,
  Save,
  Check,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { playSuccessChime } from '@/lib/audio';

interface SettingsScreenProps {
  settings: PharmacySettings;
  users: ActiveUser[];
  auditLogs: AuditLog[];
  onSaveSettings: (settings: PharmacySettings) => void;
  onUpdateUserPin: (userId: string, newPin: string) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => void;
  onResetSampleData: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  users,
  auditLogs,
  onSaveSettings,
  onUpdateUserPin,
  onExportBackup,
  onImportBackup,
  onResetSampleData,
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'roles' | 'backup' | 'audit'>('store');

  // Form State
  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [gstin, setGstin] = useState(settings.gstin);
  const [dlNumber, setDlNumber] = useState(settings.dlNumber);
  const [fssaiNumber, setFssaiNumber] = useState(settings.fssaiNumber || '');
  const [thermalWidth, setThermalWidth] = useState<'58mm' | '80mm'>(settings.thermalWidth);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [lowStockThreshold, setLowStockThreshold] = useState(settings.lowStockThreshold);
  const [nearExpiryDays, setNearExpiryDays] = useState(settings.nearExpiryDays);
  const [allowExpiredOverride, setAllowExpiredOverride] = useState(settings.allowExpiredOverride);

  const [savedNotice, setSavedNotice] = useState(false);
  const [ownerPin, setOwnerPin] = useState(users.find((u) => u.role === 'Owner')?.pin || '1234');
  const [staffPin, setStaffPin] = useState(users.find((u) => u.role === 'Pharmacist')?.pin || '0000');

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: PharmacySettings = {
      storeName,
      tagline,
      address,
      phone,
      email,
      gstin,
      dlNumber,
      fssaiNumber,
      thermalWidth,
      receiptFooter,
      lowStockThreshold: Number(lowStockThreshold) || 15,
      nearExpiryDays: Number(nearExpiryDays) || 60,
      allowExpiredOverride,
      currencySymbol: '₹',
    };
    onSaveSettings(updated);
    playSuccessChime();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSavePins = () => {
    const ownerUser = users.find((u) => u.role === 'Owner');
    const staffUser = users.find((u) => u.role === 'Pharmacist');
    if (ownerUser) onUpdateUserPin(ownerUser.id, ownerPin);
    if (staffUser) onUpdateUserPin(staffUser.id, staffPin);
    playSuccessChime();
    alert('Security PINs updated successfully!');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        onImportBackup(text);
        playSuccessChime();
        alert('Backup successfully restored! Refreshing application state.');
      } catch (err) {
        alert('Failed to parse backup file. Please provide a valid JSON state backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Settings, Compliance & Audit Trail
          </h1>
          <p className="text-xs text-slate-500">
            Store GSTIN & Drug License profile, thermal printer setup, security PINs, and full activity logs
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'store'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Store Profile
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'roles'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Security & PINs
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'backup'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Backup & Reset
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Pharmacy configuration saved successfully!</span>
        </div>
      )}

      {/* Tab 1: Store & Printer Profile */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStore} className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-500" />
              <span>Pharmacy Identification & Legal Credentials</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Store Legal Name *</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registered Address (Printed on Invoices)</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Store Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN Number *</label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Drug License (DL) No *</label>
                <input
                  type="text"
                  required
                  value={dlNumber}
                  onChange={(e) => setDlNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">FSSAI License (Optional)</label>
                <input
                  type="text"
                  value={fssaiNumber}
                  onChange={(e) => setFssaiNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          {/* POS & Thermal Receipt Settings */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-500" />
              <span>POS & Thermal Invoice Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Thermal Paper Width
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setThermalWidth('80mm')}
                    className={`py-2 rounded-lg border text-xs font-semibold ${
                      thermalWidth === '80mm'
                        ? 'bg-amber-500 border-amber-600 text-slate-950 font-bold'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    80mm (Standard POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setThermalWidth('58mm')}
                    className={`py-2 rounded-lg border text-xs font-semibold ${
                      thermalWidth === '58mm'
                        ? 'bg-amber-500 border-amber-600 text-slate-950 font-bold'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    58mm (Compact Mobile)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Receipt Footer Message
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 15)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Near Expiry Warning Window (Days)
                </label>
                <input
                  type="number"
                  min="15"
                  value={nearExpiryDays}
                  onChange={(e) => setNearExpiryDays(parseInt(e.target.value) || 60)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={allowExpiredOverride}
                    onChange={(e) => setAllowExpiredOverride(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Permit Expired Sale with Admin Override</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded-lg shadow-sm transition-colors text-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Pharmacy Configuration</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Security & PINs */}
      {activeTab === 'roles' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Counter Staff & Owner Authorization PINs</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border space-y-2">
              <span className="font-bold text-slate-900 block">Owner / Admin Security PIN</span>
              <p className="text-[11px] text-slate-500">
                Grants access to net profit figures, full financial reports, inventory deletion, and settings.
              </p>
              <input
                type="password"
                maxLength={4}
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value)}
                className="w-32 p-2 bg-white border rounded font-mono text-center font-bold tracking-widest text-base"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border space-y-2">
              <span className="font-bold text-slate-900 block">Pharmacist Counter Staff PIN</span>
              <p className="text-[11px] text-slate-500">
                Quick billing unlock for counter staff. Sensitive profit reports are hidden.
              </p>
              <input
                type="password"
                maxLength={4}
                value={staffPin}
                onChange={(e) => setStaffPin(e.target.value)}
                className="w-32 p-2 bg-white border rounded font-mono text-center font-bold tracking-widest text-base"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSavePins}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm"
            >
              Update Security PINs
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Backup & Reset */}
      {activeTab === 'backup' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Full System JSON Backup</span>
            </h3>
            <p className="text-slate-600">
              Download complete snapshot of medicines, batches, stock adjustments, customer ledger, supplier bills, and sales invoices as an encrypted JSON file.
            </p>
            <button
              onClick={onExportBackup}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Full State Backup (.json)</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-600" />
              <span>Restore Backup File</span>
            </h3>
            <p className="text-slate-600">
              Restore inventory, customers, and previous bills from a JSON backup.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload Backup JSON</span>
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>
          </div>

          <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-rose-700 border-b pb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-rose-600" />
              <span>Reset to Factory Sample Data</span>
            </h3>
            <p className="text-slate-600">
              Reset medicines, customers, suppliers, and billing records to fresh Golden Medical Store demo seed data.
            </p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all data to initial sample store data?')) {
                  onResetSampleData();
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-sm"
            >
              Reset to Sample Data
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b font-semibold text-xs text-slate-700 flex justify-between items-center">
            <span>System Audit & Compliance Log</span>
            <span className="text-slate-400 font-normal">Immutable activity record</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500">{log.timestamp}</td>
                    <td className="p-3 font-semibold text-slate-900">{log.action}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                        {log.category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 font-sans">{log.user}</td>
                    <td className="p-3 text-slate-600 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
