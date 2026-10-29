'use client';

import React, { useState } from 'react';
import { Batch, MedicineCategory, MedicineUnit, Product } from '@/types/pharmacy';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { getTodayDateString, generateUniqueId, getCurrentYear } from '@/lib/inventory-utils';

interface AddEditProductModalProps {
  productToEdit?: Product | null;
  onSave: (product: Product) => void;
  onClose: () => void;
}

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  productToEdit,
  onSave,
  onClose,
}) => {
  const isEditing = !!productToEdit;

  // Form State
  const [name, setName] = useState(productToEdit?.name || '');
  const [brand, setBrand] = useState(productToEdit?.brand || '');
  const [genericName, setGenericName] = useState(productToEdit?.genericName || '');
  const [category, setCategory] = useState<MedicineCategory>(productToEdit?.category || 'Tablet');
  const [barcode, setBarcode] = useState(() => productToEdit?.barcode || generateUniqueId('890'));
  const [hsnCode, setHsnCode] = useState(productToEdit?.hsnCode || '30049099');
  const [unit, setUnit] = useState<MedicineUnit>(productToEdit?.unit || 'Strip');
  const [packSize, setPackSize] = useState(productToEdit?.packSize || '10 Tabs/Strip');
  const [rackLocation, setRackLocation] = useState(productToEdit?.rackLocation || 'Rack A-1');
  const [prescriptionRequired, setPrescriptionRequired] = useState(productToEdit?.prescriptionRequired || false);
  const [minStockLevel, setMinStockLevel] = useState(productToEdit?.minStockLevel || 15);
  const [notes, setNotes] = useState(productToEdit?.notes || '');

  // Batches
  const [batches, setBatches] = useState<Batch[]>(() =>
    productToEdit?.batches && productToEdit.batches.length > 0
      ? productToEdit.batches
      : [
          {
            id: generateUniqueId('b'),
            batchNumber: `BAT${getCurrentYear().toString().substring(2)}A01`,
            mfgDate: '2026-01',
            expiryDate: '2028-06-30',
            purchaseRate: 50,
            mrp: 85,
            sellingPrice: 80,
            gstRate: 12,
            quantity: 50,
          },
        ]
  );

  const [priceWarning, setPriceWarning] = useState('');

  const handleBatchChange = (index: number, field: keyof Batch, value: any) => {
    const updated = [...batches];
    updated[index] = { ...updated[index], [field]: value };
    setBatches(updated);

    // Validation: Check if selling price is lower than purchase rate
    if (field === 'sellingPrice' || field === 'purchaseRate') {
      const b = updated[index];
      if (b.sellingPrice < b.purchaseRate) {
        setPriceWarning(`Warning on Batch ${b.batchNumber}: Selling price (₹${b.sellingPrice}) is below purchase cost (₹${b.purchaseRate}).`);
      } else {
        setPriceWarning('');
      }
    }
  };

  const handleAddBatch = () => {
    const newB: Batch = {
      id: generateUniqueId('b'),
      batchNumber: `BAT${getCurrentYear().toString().substring(2)}${String.fromCharCode(65 + batches.length)}01`,
      mfgDate: getTodayDateString().substring(0, 7),
      expiryDate: '2028-12-31',
      purchaseRate: batches[0]?.purchaseRate || 50,
      mrp: batches[0]?.mrp || 85,
      sellingPrice: batches[0]?.sellingPrice || 80,
      gstRate: batches[0]?.gstRate || 12,
      quantity: 20,
    };
    setBatches([...batches, newB]);
  };

  const handleRemoveBatch = (index: number) => {
    if (batches.length === 1) {
      alert('A medicine must have at least one batch');
      return;
    }
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !genericName.trim()) {
      alert('Product Name and Generic Salt Name are required');
      return;
    }

    const savedProduct: Product = {
      id: productToEdit?.id || generateUniqueId('prod'),
      name: name.trim(),
      brand: brand.trim() || 'General Pharma',
      genericName: genericName.trim(),
      category,
      barcode: barcode.trim(),
      hsnCode: hsnCode.trim(),
      unit,
      packSize: packSize.trim(),
      rackLocation: rackLocation.trim(),
      prescriptionRequired,
      minStockLevel: Number(minStockLevel) || 10,
      notes: notes.trim(),
      batches,
    };

    onSave(savedProduct);
    onClose();
  };

  const categories: MedicineCategory[] = [
    'Tablet',
    'Capsule',
    'Syrup',
    'Injection',
    'Ointment',
    'Drops',
    'Inhaler',
    'Surgical',
    'Ayurvedic',
    'Cosmetics',
    'General',
  ];

  const units: MedicineUnit[] = [
    'Strip',
    'Bottle',
    'Piece',
    'Box',
    'Vial',
    'Ampoule',
    'Tube',
    'Sachet',
    'Jar',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base">
              {isEditing ? `Edit Medicine: ${productToEdit?.name}` : 'Add New Medicine to Inventory'}
            </h3>
            <p className="text-xs text-slate-400">
              Complete batch-wise product master for Golden Medical Store
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          
          {priceWarning && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{priceWarning}</span>
            </div>
          )}

          {/* Section 1: Basic Medicine Information */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 border-b pb-1 uppercase tracking-wider text-[11px]">
              1. Medicine Master Information
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product / Medicine Trade Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dolo 650 Tablet, Pan-D, Augmentin 625"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Brand / Manufacturer
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Cipla, Sun Pharma, Micro Labs, GSK"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Generic Composition / Active Salt *
                </label>
                <input
                  type="text"
                  required
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  placeholder="e.g. Paracetamol (650mg), Amoxicillin + Clavulanic Acid"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MedicineCategory)}
                    className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as MedicineUnit)}
                    className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pack Size</label>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder="e.g. 10 Tabs, 100ml"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rack / Shelf</label>
                <input
                  type="text"
                  value={rackLocation}
                  onChange={(e) => setRackLocation(e.target.value)}
                  placeholder="e.g. Rack A-1, Fridge"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Barcode / SKU</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="30049099"
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={prescriptionRequired}
                  onChange={(e) => setPrescriptionRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Schedule H / Prescription Required (Rx)</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Reorder Alert Level:</span>
                <input
                  type="number"
                  min="1"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 10)}
                  className="w-16 p-1.5 bg-slate-50 border rounded font-mono text-center"
                />
                <span className="text-slate-500">units</span>
              </div>
            </div>
          </div>

          {/* Section 2: Batch Inventory Management */}
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                2. Batches & Stock Quantities
              </h4>
              <button
                type="button"
                onClick={handleAddBatch}
                className="flex items-center gap-1 text-xs text-amber-700 font-semibold hover:text-amber-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Batch</span>
              </button>
            </div>

            <div className="space-y-2">
              {batches.map((batch, idx) => (
                <div
                  key={batch.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span>Batch #{idx + 1}</span>
                    {batches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBatch(idx)}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium">Batch No *</label>
                      <input
                        type="text"
                        required
                        value={batch.batchNumber}
                        onChange={(e) => handleBatchChange(idx, 'batchNumber', e.target.value)}
                        className="w-full p-1.5 bg-white border rounded font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium">Mfg Date (YYYY-MM)</label>
                      <input
                        type="month"
                        value={batch.mfgDate}
                        onChange={(e) => handleBatchChange(idx, 'mfgDate', e.target.value)}
                        className="w-full p-1.5 bg-white border rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium">Expiry Date *</label>
                      <input
                        type="date"
                        required
                        value={batch.expiryDate}
                        onChange={(e) => handleBatchChange(idx, 'expiryDate', e.target.value)}
                        className="w-full p-1.5 bg-white border rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium">Available Qty *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={batch.quantity}
                        onChange={(e) => handleBatchChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full p-1.5 bg-white border rounded font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium">Purchase Rate (Cost)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={batch.purchaseRate}
                        onChange={(e) => handleBatchChange(idx, 'purchaseRate', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-white border rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium">MRP (Max Retail)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={batch.mrp}
                        onChange={(e) => handleBatchChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-white border rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium">Selling Price (POS)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={batch.sellingPrice}
                        onChange={(e) => handleBatchChange(idx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-white border rounded font-mono font-bold text-amber-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium">GST Rate (%)</label>
                      <select
                        value={batch.gstRate}
                        onChange={(e) => handleBatchChange(idx, 'gstRate', parseInt(e.target.value) || 12)}
                        className="w-full p-1.5 bg-white border rounded font-mono"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12% (Standard)</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-3 border-t">
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
              {isEditing ? 'Save Medicine Changes' : 'Save Medicine to Inventory'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
