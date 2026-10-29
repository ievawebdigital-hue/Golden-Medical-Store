'use client';

import React, { useState } from 'react';
import { PharmacySettings, SaleInvoice } from '@/types/pharmacy';
import { Printer, Share2, X, Download, FileText, Check } from 'lucide-react';
import { formatCurrency, generateWhatsAppMessage } from '@/lib/inventory-utils';

interface ThermalInvoiceModalProps {
  invoice: SaleInvoice;
  settings: PharmacySettings;
  onClose: () => void;
}

export const ThermalInvoiceModal: React.FC<ThermalInvoiceModalProps> = ({
  invoice,
  settings,
  onClose,
}) => {
  const [format, setFormat] = useState<'80mm' | '58mm' | 'a4'>(settings.thermalWidth || '80mm');
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const encoded = generateWhatsAppMessage(invoice, settings.storeName, settings.phone);
    const url = invoice.customerPhone
      ? `https://wa.me/91${invoice.customerPhone.replace(/\D/g, '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const text = decodeURIComponent(
      generateWhatsAppMessage(invoice, settings.storeName, settings.phone)
    );
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Controls Bar (Hidden during window.print) */}
        <div className="no-print bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-amber-400">Invoice #{invoice.invoiceNumber}</span>
            <span className="text-xs text-slate-400">· {invoice.date}</span>
          </div>

          {/* Format Selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFormat('80mm')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                format === '80mm' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              80mm Thermal
            </button>
            <button
              onClick={() => setFormat('58mm')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                format === '58mm' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              58mm Thermal
            </button>
            <button
              onClick={() => setFormat('a4')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                format === 'a4' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              A4 Tax Bill
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>

            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
              title="Share via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleCopyText}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors"
              title="Copy receipt text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-6 max-h-[75vh] overflow-y-auto bg-slate-100 flex justify-center">
          
          <div
            id="printable-receipt"
            className={`bg-white text-slate-900 shadow-md border border-slate-200 p-4 sm:p-6 transition-all ${
              format === '58mm'
                ? 'w-[280px] font-mono text-[11px]'
                : format === '80mm'
                ? 'w-[380px] font-mono text-xs'
                : 'w-full max-w-xl font-sans text-xs'
            }`}
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-bold text-base sm:text-lg tracking-tight uppercase text-slate-950">
                {settings.storeName}
              </h2>
              <p className="text-[11px] text-slate-600 font-sans mt-0.5">{settings.tagline}</p>
              <p className="text-[10px] text-slate-600 mt-1">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Ph: {settings.phone}</p>
              <div className="flex justify-center gap-2 text-[10px] font-semibold text-slate-700 mt-1">
                <span>GSTIN: {settings.gstin}</span>
                <span>·</span>
                <span>DL: {settings.dlNumber}</span>
              </div>
            </div>

            {/* Invoice & Customer Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Invoice: <strong className="font-mono">{invoice.invoiceNumber}</strong></span>
                <span>Date: {invoice.date} {invoice.time.substring(0, 5)}</span>
              </div>
              <div className="flex justify-between">
                <span>Patient: <strong>{invoice.customerName}</strong></span>
                {invoice.customerPhone && <span>Mob: {invoice.customerPhone}</span>}
              </div>
              {invoice.doctorName && (
                <div>
                  <span>Doctor: <strong>{invoice.doctorName}</strong></span>
                </div>
              )}
              {invoice.prescriptionNotes && (
                <div className="text-[10px] text-slate-500 italic">
                  Note: {invoice.prescriptionNotes}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-slate-400">
              <div className="grid grid-cols-12 font-bold pb-1 text-[10px] text-slate-700 border-b border-slate-200 uppercase">
                <span className="col-span-6">Item / Batch / Exp</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Rate</span>
                <span className="col-span-2 text-right">Amt</span>
              </div>

              <div className="divide-y divide-slate-100 my-1">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1.5 items-start">
                    <div className="col-span-6 pr-1">
                      <div className="font-semibold text-slate-900 leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        B:{item.batchNumber} · Exp:{item.expiryDate.substring(2, 7)} · GST:{item.gstRate}%
                      </div>
                    </div>
                    <div className="col-span-2 text-center font-mono tabular-nums">
                      {item.quantity}
                    </div>
                    <div className="col-span-2 text-right font-mono tabular-nums text-slate-700">
                      ₹{item.unitPrice.toFixed(0)}
                    </div>
                    <div className="col-span-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ₹{(item.quantity * item.unitPrice * (1 - item.discountPercent / 100)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums">₹{invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Discount:</span>
                  <span className="font-mono tabular-nums">-₹{invoice.totalDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>Taxable Value:</span>
                <span className="font-mono tabular-nums">₹{invoice.taxableAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>CGST:</span>
                <span className="font-mono tabular-nums">₹{invoice.cgstAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>SGST:</span>
                <span className="font-mono tabular-nums">₹{invoice.sgstAmount.toFixed(2)}</span>
              </div>

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Round Off:</span>
                  <span className="font-mono tabular-nums">
                    {invoice.roundOff > 0 ? `+₹${invoice.roundOff.toFixed(2)}` : `-₹${Math.abs(invoice.roundOff).toFixed(2)}`}
                  </span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-300 font-bold text-sm text-slate-950">
                <span>GRAND TOTAL:</span>
                <span className="font-mono tabular-nums text-base">₹{invoice.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment & Cashier Details */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Paid via: <strong className="uppercase">{invoice.paymentMode}</strong></span>
                <span className="font-mono font-semibold">₹{invoice.amountPaid.toFixed(2)}</span>
              </div>

              {invoice.paymentMode === 'Cash' && invoice.cashTendered && (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Cash Tendered: ₹{invoice.cashTendered}</span>
                  <span>Change Given: ₹{invoice.cashChange || 0}</span>
                </div>
              )}

              {invoice.amountDue > 0 && (
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Balance Due (Udhaar):</span>
                  <span className="font-mono">₹{invoice.amountDue.toFixed(2)}</span>
                </div>
              )}

              <div className="text-[10px] text-slate-500 pt-1">
                Billed by: {invoice.cashierName}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 font-sans space-y-1">
              <p>{settings.receiptFooter}</p>
              <p className="text-[9px] text-slate-400">Computer generated bill. No signature required.</p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
