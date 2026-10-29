'use client';

import React, { useState } from 'react';
import { Product, StockAdjustmentReason } from '@/types/pharmacy';
import { X, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { playSuccessChime } from '@/lib/audio';

interface StockAdjustmentModalProps {
  products: Product[];
  onAdjustStock: (
    productId: string,
    batchId: string,
    quantityChange: number,
    reason: StockAdjustmentReason,
    notes: string
  ) => void;
  onClose: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  products,
  onAdjustStock,
  onClose,
}) => {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const product = products.find((p) => p.id === selectedProductId);
  const [selectedBatchId, setSelectedBatchId] = useState(product?.batches[0]?.id || '');
  const batch = product?.batches.find((b) => b.id === selectedBatchId) || product?.batches[0];

  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentReason>('Damage');
  const [adjustmentMode, setAdjustmentMode] = useState<'decrease' | 'increase'>('decrease');
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const currentStock = batch ? batch.quantity : 0;
  const quantityChange = adjustmentMode === 'decrease' ? -Math.abs(qty) : Math.abs(qty);
  const resultingStock = currentStock + quantityChange;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !batch) return;
    if (qty <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    if (resultingStock < 0) {
      alert('Resulting stock cannot be negative');
      return;
    }

    onAdjustStock(product.id, batch.id, quantityChange, adjustmentType, notes);
    playSuccessChime();
    onClose();
  };

  const adjustmentReasons: StockAdjustmentReason[] = [
    'Damage',
    'Theft',
    'Expiry Disposal',
    'Physical Audit Discrepancy',
    'Return to Supplier',
    'Manual Correction',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">Inventory Stock Adjustment</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Medicine</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                const pId = e.target.value;
                setSelectedProductId(pId);
                const found = products.find((p) => p.id === pId);
                if (found && found.batches.length > 0) {
                  setSelectedBatchId(found.batches[0].id);
                }
              }}
              className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand})
                </option>
              ))}
            </select>
          </div>

          {product && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500"
              >
                {product.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Batch: {b.batchNumber} (Exp: {b.expiryDate}) · Current Stock: {b.quantity}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adjustment Action</label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setAdjustmentMode('decrease')}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    adjustmentMode === 'decrease'
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  - Deduct
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentMode('increase')}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    adjustmentMode === 'increase'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  + Add Stock
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity ({product?.unit}s)</label>
              <input
                type="number"
                min="1"
                required
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                className="w-full p-2 bg-slate-50 border rounded-lg font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason Category</label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as StockAdjustmentReason)}
              className="w-full p-2 bg-slate-50 border rounded-lg"
            >
              {adjustmentReasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Audit Notes / Explanation</label>
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken bottle during restocking, water damage on shelf"
              className="w-full p-2 bg-slate-50 border rounded-lg"
            />
          </div>

          {/* Resulting stock preview banner */}
          <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-slate-500">Current Stock:</span> <strong>{currentStock}</strong>
            </div>
            <div>
              <span className="text-slate-500">Change:</span>{' '}
              <strong className={quantityChange < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                {quantityChange > 0 ? `+${quantityChange}` : quantityChange}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">New Stock:</span>{' '}
              <strong className="text-base font-bold text-slate-900">{resultingStock}</strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded-lg shadow-sm"
            >
              Confirm Adjustment
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
