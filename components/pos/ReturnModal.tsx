'use client';

import React, { useState } from 'react';
import { ReturnItem, SaleInvoice } from '@/types/pharmacy';
import { X, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { playWarningBuzzer, playSuccessChime } from '@/lib/audio';

interface ReturnModalProps {
  invoices: SaleInvoice[];
  onCompleteReturn: (
    invoice: SaleInvoice,
    returnedItems: ReturnItem[],
    refundMode: 'Cash' | 'Credit Note' | 'UPI',
    reasonNotes: string
  ) => void;
  onClose: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  invoices,
  onCompleteReturn,
  onClose,
}) => {
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [refundMode, setRefundMode] = useState<'Cash' | 'Credit Note' | 'UPI'>('Cash');
  const [generalNotes, setGeneralNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectInvoice = (inv: SaleInvoice) => {
    setSelectedInvoice(inv);
    setErrorMsg('');
    // Initialize quantities to 0
    const initialQty: Record<string, number> = {};
    const initialReasons: Record<string, string> = {};
    inv.items.forEach((it) => {
      initialQty[`${it.productId}_${it.batchId}`] = 0;
      initialReasons[`${it.productId}_${it.batchId}`] = 'Doctor changed prescription';
    });
    setReturnQuantities(initialQty);
    setReturnReasons(initialReasons);
  };

  const handleQtyChange = (key: string, qty: number, maxQty: number) => {
    if (qty < 0) qty = 0;
    if (qty > maxQty) qty = maxQty;
    setReturnQuantities((prev) => ({ ...prev, [key]: qty }));
  };

  const handleReasonChange = (key: string, reason: string) => {
    setReturnReasons((prev) => ({ ...prev, [key]: reason }));
  };

  // Calculate total refund amount
  const itemsToReturn: ReturnItem[] = [];
  let calculatedRefund = 0;

  if (selectedInvoice) {
    selectedInvoice.items.forEach((it) => {
      const key = `${it.productId}_${it.batchId}`;
      const qty = returnQuantities[key] || 0;
      if (qty > 0) {
        const rateAfterDiscount = it.unitPrice * (1 - it.discountPercent / 100);
        const itemRefund = qty * rateAfterDiscount;
        calculatedRefund += itemRefund;
        itemsToReturn.push({
          productId: it.productId,
          batchId: it.batchId,
          name: it.name,
          batchNumber: it.batchNumber,
          quantity: qty,
          refundRate: rateAfterDiscount,
          totalRefund: itemRefund,
          reason: returnReasons[key] || 'Customer return',
        });
      }
    });
  }

  const handleSubmitReturn = () => {
    if (!selectedInvoice) return;
    if (itemsToReturn.length === 0) {
      setErrorMsg('Please specify return quantity of at least 1 item.');
      playWarningBuzzer();
      return;
    }
    playSuccessChime();
    onCompleteReturn(selectedInvoice, itemsToReturn, refundMode, generalNotes);
    onClose();
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchInvoiceNo.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchInvoiceNo.toLowerCase()) ||
      (inv.customerPhone && inv.customerPhone.includes(searchInvoiceNo))
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-base">Sales Return & Stock Restoration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Search Invoice */}
          {!selectedInvoice ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Search Original Bill Number or Customer Mobile
              </label>
              <input
                type="text"
                value={searchInvoiceNo}
                onChange={(e) => setSearchInvoiceNo(e.target.value)}
                placeholder="e.g. GMS-2026-1001 or 98765..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />

              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Recent Invoices
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className="p-3 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-900">
                          #{inv.invoiceNumber} · {inv.customerName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {inv.date} at {inv.time.substring(0, 5)} · {inv.items.length} items · Paid via {inv.paymentMode}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-slate-900 font-mono">
                          ₹{inv.grandTotal}
                        </div>
                        <span className="text-[11px] text-amber-700 font-medium">Select & Return →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Select Items to Return */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                <div>
                  <span className="font-bold text-amber-950">
                    Bill #{selectedInvoice.invoiceNumber}
                  </span>{' '}
                  ({selectedInvoice.date}) — Customer: <strong>{selectedInvoice.customerName}</strong>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-amber-800 underline font-medium hover:text-amber-950"
                >
                  Change Bill
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 grid grid-cols-12 gap-2">
                  <span className="col-span-5">Item / Batch</span>
                  <span className="col-span-2 text-center">Billed Qty</span>
                  <span className="col-span-2 text-center">Return Qty</span>
                  <span className="col-span-3 text-right">Refund Amount</span>
                </div>

                <div className="divide-y divide-slate-100 p-2 space-y-2">
                  {selectedInvoice.items.map((it) => {
                    const key = `${it.productId}_${it.batchId}`;
                    const currentReturnQty = returnQuantities[key] || 0;
                    const rateAfterDiscount = it.unitPrice * (1 - it.discountPercent / 100);

                    return (
                      <div key={key} className="p-2 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-5">
                            <div className="font-semibold text-slate-900">{it.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Batch: {it.batchNumber} · Exp: {it.expiryDate}
                            </div>
                          </div>

                          <div className="col-span-2 text-center font-mono font-medium">
                            {it.quantity}
                          </div>

                          <div className="col-span-2 flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={it.quantity}
                              value={currentReturnQty}
                              onChange={(e) =>
                                handleQtyChange(key, parseInt(e.target.value) || 0, it.quantity)
                              }
                              className="w-16 px-1.5 py-1 text-center bg-white border border-slate-300 rounded font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div className="col-span-3 text-right font-mono font-semibold text-slate-900">
                            ₹{(currentReturnQty * rateAfterDiscount).toFixed(2)}
                          </div>
                        </div>

                        {currentReturnQty > 0 && (
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-xs">
                            <span className="text-slate-500 text-[11px] shrink-0">Reason:</span>
                            <select
                              value={returnReasons[key] || 'Doctor changed prescription'}
                              onChange={(e) => handleReasonChange(key, e.target.value)}
                              className="text-xs bg-white border border-slate-300 rounded px-2 py-0.5 w-full text-slate-700"
                            >
                              <option value="Doctor changed prescription">Doctor changed prescription</option>
                              <option value="Excess strips purchased">Excess strips purchased</option>
                              <option value="Wrong medicine dispensed">Wrong medicine dispensed</option>
                              <option value="Adverse reaction / side effect">Adverse reaction / side effect</option>
                              <option value="Damaged / broken seal returned">Damaged / broken seal returned</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Method & Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Refund Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Cash', 'Credit Note', 'UPI'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setRefundMode(m)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          refundMode === m
                            ? 'bg-amber-500 border-amber-600 text-slate-950'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg flex flex-col justify-between">
                  <div className="text-xs text-slate-400">Total Refund Payable</div>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    ₹{calculatedRefund.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Inventory will be automatically restocked (+Qty) upon confirmation.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReturn}
                  disabled={calculatedRefund <= 0}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Refund & Restock Stock</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
