'use client';

import React, { useState } from 'react';
import { Product } from '@/types/pharmacy';
import { X, ClipboardCheck, AlertCircle, Check } from 'lucide-react';
import { playSuccessChime } from '@/lib/audio';

interface StockAuditModalProps {
  products: Product[];
  onApplyAudit: (
    reconciledBatches: {
      productId: string;
      productName: string;
      batchId: string;
      batchNumber: string;
      previousQty: number;
      newQty: number;
    }[]
  ) => void;
  onClose: () => void;
}

export const StockAuditModal: React.FC<StockAuditModalProps> = ({
  products,
  onApplyAudit,
  onClose,
}) => {
  // Flatten products and batches into auditable rows
  const initialRows = products.flatMap((p) =>
    p.batches.map((b) => ({
      productId: p.id,
      productName: p.name,
      category: p.category,
      rackLocation: p.rackLocation,
      batchId: b.id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      systemQty: b.quantity,
      physicalQty: b.quantity, // Default to system qty
      purchaseRate: b.purchaseRate,
    }))
  );

  const [auditRows, setAuditRows] = useState(initialRows);
  const [filterRack, setFilterRack] = useState<string>('All');

  const handlePhysicalQtyChange = (batchId: string, val: number) => {
    if (val < 0) val = 0;
    setAuditRows((prev) =>
      prev.map((row) => (row.batchId === batchId ? { ...row, physicalQty: val } : row))
    );
  };

  // Find discrepancies
  const discrepancies = auditRows.filter((r) => r.physicalQty !== r.systemQty);
  const totalVarianceCost = discrepancies.reduce(
    (sum, r) => sum + (r.physicalQty - r.systemQty) * r.purchaseRate,
    0
  );

  const handleReconcile = () => {
    if (discrepancies.length === 0) {
      alert('All physical counts match system stock. No adjustments needed!');
      onClose();
      return;
    }

    if (
      confirm(
        `Are you sure you want to reconcile ${discrepancies.length} discrepancies? System inventory will be updated to match physical shelf counts.`
      )
    ) {
      const payload = discrepancies.map((d) => ({
        productId: d.productId,
        productName: d.productName,
        batchId: d.batchId,
        batchNumber: d.batchNumber,
        previousQty: d.systemQty,
        newQty: d.physicalQty,
      }));

      onApplyAudit(payload);
      playSuccessChime();
      onClose();
    }
  };

  const racks = ['All', ...Array.from(new Set(products.map((p) => p.rackLocation)))];

  const visibleRows = auditRows.filter(
    (r) => filterRack === 'All' || r.rackLocation === filterRack
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Physical Stock Audit & Reconciler</h3>
              <p className="text-xs text-slate-400">
                Count medicine units on shelves and adjust system stock automatically
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Stats */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Filter by Shelf / Rack:</span>
            <select
              value={filterRack}
              onChange={(e) => setFilterRack(e.target.value)}
              className="p-1.5 bg-white border border-slate-300 rounded font-medium"
            >
              {racks.map((rk) => (
                <option key={rk} value={rk}>{rk}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div>
              Discrepancies found: <strong className="text-rose-600 font-mono">{discrepancies.length}</strong>
            </div>
            <div>
              Net Value Variance:{' '}
              <strong
                className={`font-mono ${
                  totalVarianceCost < 0
                    ? 'text-rose-600'
                    : totalVarianceCost > 0
                    ? 'text-emerald-700'
                    : 'text-slate-700'
                }`}
              >
                {totalVarianceCost > 0 ? `+₹${totalVarianceCost.toFixed(2)}` : `₹${totalVarianceCost.toFixed(2)}`}
              </strong>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="p-2.5">Medicine Name</th>
                <th className="p-2.5">Rack</th>
                <th className="p-2.5">Batch</th>
                <th className="p-2.5 text-center">System Qty</th>
                <th className="p-2.5 text-center">Physical Count</th>
                <th className="p-2.5 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row) => {
                const diff = row.physicalQty - row.systemQty;
                const hasDiff = diff !== 0;

                return (
                  <tr
                    key={row.batchId}
                    className={`hover:bg-slate-50 transition-colors ${
                      hasDiff ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <td className="p-2.5 font-medium text-slate-900">
                      {row.productName}
                    </td>
                    <td className="p-2.5 text-slate-500 font-medium">
                      {row.rackLocation}
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">
                      {row.batchNumber}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                      {row.systemQty}
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        value={row.physicalQty}
                        onChange={(e) =>
                          handlePhysicalQtyChange(
                            row.batchId,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 p-1 text-center bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold">
                      {diff === 0 ? (
                        <span className="text-slate-400">Match</span>
                      ) : (
                        <span className={diff < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Clicking reconcile creates audit logs and overwrites current batch stock levels.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReconcile}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Reconcile & Update Inventory ({discrepancies.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
