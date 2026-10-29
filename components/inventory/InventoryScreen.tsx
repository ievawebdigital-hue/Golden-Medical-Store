'use client';

import React, { useState } from 'react';
import {
  ActiveUser,
  Batch,
  MedicineCategory,
  Product,
  StockAdjustmentReason,
} from '@/types/pharmacy';
import {
  Search,
  Plus,
  SlidersHorizontal,
  ClipboardCheck,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Boxes,
  ShieldAlert,
  CalendarClock,
  PackageX,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  formatCurrency,
  getDaysUntilExpiry,
  getExpiryAlertLevel,
  getProductTotalStock,
  sortBatchesFEFO,
} from '@/lib/inventory-utils';
import { AddEditProductModal } from './AddEditProductModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockAuditModal } from './StockAuditModal';
import { CsvImportExport } from './CsvImportExport';

interface InventoryScreenProps {
  products: Product[];
  activeUser: ActiveUser;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAdjustStock: (
    productId: string,
    batchId: string,
    quantityChange: number,
    reason: StockAdjustmentReason,
    notes: string
  ) => void;
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
  onImportProducts: (newProducts: Product[]) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  products,
  activeUser,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
  onApplyAudit,
  onImportProducts,
}) => {
  const isOwner = activeUser.role === 'Owner';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expiryFilter, setExpiryFilter] = useState<'All' | 'Expired' | '30d' | '60d' | '90d'>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'Out' | 'In'>('All');
  const [selectedRack, setSelectedRack] = useState<string>('All');

  // Expanded Product IDs for batch drawer
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Overall KPI metrics
  let totalUnits = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let expiredBatchCount = 0;
  let nearExpiryCount = 0; // <= 60 days
  let lowStockItemCount = 0;

  products.forEach((p) => {
    const stock = getProductTotalStock(p);
    if (stock <= p.minStockLevel) lowStockItemCount++;

    p.batches.forEach((b) => {
      totalUnits += b.quantity;
      totalCostValuation += b.quantity * b.purchaseRate;
      totalRetailValuation += b.quantity * b.sellingPrice;

      const days = getDaysUntilExpiry(b.expiryDate);
      if (days <= 0 && b.quantity > 0) expiredBatchCount++;
      else if (days <= 60 && b.quantity > 0) nearExpiryCount++;
    });
  });

  // Filter products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.genericName.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.rackLocation.toLowerCase().includes(q) ||
      p.batches.some((b) => b.batchNumber.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === 'All' || p.category === selectedCategory;

    const matchesRack =
      selectedRack === 'All' || p.rackLocation === selectedRack;

    const totalStock = getProductTotalStock(p);
    let matchesStock = true;
    if (stockFilter === 'Low') matchesStock = totalStock <= p.minStockLevel && totalStock > 0;
    if (stockFilter === 'Out') matchesStock = totalStock === 0;
    if (stockFilter === 'In') matchesStock = totalStock > p.minStockLevel;

    let matchesExpiry = true;
    if (expiryFilter !== 'All') {
      matchesExpiry = p.batches.some((b) => {
        const days = getDaysUntilExpiry(b.expiryDate);
        if (expiryFilter === 'Expired') return days <= 0 && b.quantity > 0;
        if (expiryFilter === '30d') return days > 0 && days <= 30 && b.quantity > 0;
        if (expiryFilter === '60d') return days > 0 && days <= 60 && b.quantity > 0;
        if (expiryFilter === '90d') return days > 0 && days <= 90 && b.quantity > 0;
        return true;
      });
    }

    return matchesSearch && matchesCategory && matchesRack && matchesStock && matchesExpiry;
  });

  const allRacks = ['All', ...Array.from(new Set(products.map((p) => p.rackLocation)))];
  const allCategories = [
    'All',
    'Tablet',
    'Capsule',
    'Syrup',
    'Injection',
    'Ointment',
    'Drops',
    'Inhaler',
    'Surgical',
    'Ayurvedic',
    'General',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      
      {/* Top Header & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Medicine Inventory Master
          </h1>
          <p className="text-xs text-slate-500">
            Batch-wise stock tracking, FEFO auto-rotation, expiry monitoring, and physical audit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CsvImportExport products={products} onImportProducts={onImportProducts} />

          <button
            onClick={() => setIsAdjustmentOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            <span>Stock Adjustment</span>
          </button>

          <button
            onClick={() => setIsAuditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>Physical Count Audit</span>
          </button>

          <button
            onClick={() => {
              setProductToEdit(null);
              setIsAddEditOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Medicine</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Total Products</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">{products.length} SKUs</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Stock Units</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">{totalUnits.toLocaleString()}</div>
        </div>

        {isOwner && (
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-medium">Stock Value (Cost)</span>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              ₹{totalCostValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        )}

        <div
          onClick={() => {
            setExpiryFilter('Expired');
            setStockFilter('All');
          }}
          className={`p-3 rounded-xl border shadow-sm cursor-pointer transition-colors ${
            expiredBatchCount > 0
              ? 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100'
              : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Expired Stock</span>
          </span>
          <div className="text-lg font-bold font-mono text-rose-700 mt-0.5">
            {expiredBatchCount} batches
          </div>
        </div>

        <div
          onClick={() => {
            setExpiryFilter('60d');
            setStockFilter('All');
          }}
          className={`p-3 rounded-xl border shadow-sm cursor-pointer transition-colors ${
            nearExpiryCount > 0
              ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
              : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Near Expiry (≤60d)</span>
          </span>
          <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">
            {nearExpiryCount} batches
          </div>
        </div>

        <div
          onClick={() => {
            setStockFilter('Low');
            setExpiryFilter('All');
          }}
          className={`p-3 rounded-xl border shadow-sm cursor-pointer transition-colors ${
            lowStockItemCount > 0
              ? 'bg-amber-50/50 border-amber-200 text-amber-950 hover:bg-amber-100'
              : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
            <PackageX className="w-3.5 h-3.5 text-amber-600" />
            <span>Low Stock Items</span>
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            {lowStockItemCount} items
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Medicine name, Generic salt, Brand, Barcode, Rack, Batch..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedRack}
              onChange={(e) => setSelectedRack(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
            >
              {allRacks.map((rk) => (
                <option key={rk} value={rk}>{rk === 'All' ? 'All Racks' : rk}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-1">
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value as any)}
              className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
            >
              <option value="All">All Expiry</option>
              <option value="Expired">Expired</option>
              <option value="30d">≤30 Days</option>
              <option value="60d">≤60 Days</option>
              <option value="90d">≤90 Days</option>
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
            >
              <option value="All">All Stock</option>
              <option value="Low">Low Stock</option>
              <option value="Out">Out of Stock</option>
              <option value="In">In Stock</option>
            </select>
          </div>

        </div>

        {/* Active Filter Clear indicator */}
        {(selectedCategory !== 'All' || selectedRack !== 'All' || expiryFilter !== 'All' || stockFilter !== 'All' || searchQuery) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Showing {filteredProducts.length} filtered products</span>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedRack('All');
                setExpiryFilter('All');
                setStockFilter('All');
                setSearchQuery('');
              }}
              className="text-amber-700 hover:text-amber-800 font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Inventory Table with Expandable Batches */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3">Medicine & Salt</th>
                <th className="p-3">Category</th>
                <th className="p-3">Rack</th>
                <th className="p-3 text-center">Batches</th>
                <th className="p-3 text-center">Total Stock</th>
                <th className="p-3 text-right">Selling Price</th>
                {isOwner && <th className="p-3 text-right">Cost Price</th>}
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No medicines found matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isExpanded = !!expandedProductIds[p.id];
                  const totalStock = getProductTotalStock(p);
                  const isLow = totalStock <= p.minStockLevel;
                  const fefoBatches = sortBatchesFEFO(p.batches);
                  const firstBatch = fefoBatches[0];

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors ${
                          isExpanded ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td
                          className="p-3 text-center cursor-pointer text-slate-400 hover:text-slate-900"
                          onClick={() => toggleExpand(p.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-amber-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          <div className="text-[11px] text-slate-600">
                            <strong>Generic:</strong> {p.genericName}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5 font-mono">
                            <span>Brand: {p.brand}</span>
                            <span>·</span>
                            <span>HSN: {p.hsnCode}</span>
                            {p.prescriptionRequired && (
                              <>
                                <span>·</span>
                                <span className="text-rose-700 font-bold bg-rose-50 px-1 rounded">Rx (Sched H)</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-slate-600">
                          <span className="font-medium">{p.category}</span>
                          <div className="text-[10px] text-slate-400">{p.packSize}</div>
                        </td>

                        <td className="p-3 font-medium text-amber-800">
                          {p.rackLocation}
                        </td>

                        <td className="p-3 text-center font-mono">
                          <button
                            onClick={() => toggleExpand(p.id)}
                            className="text-amber-700 hover:underline font-semibold"
                          >
                            {p.batches.length} {p.batches.length === 1 ? 'batch' : 'batches'}
                          </button>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`font-mono font-bold text-sm ${
                              totalStock <= 0
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {totalStock} {p.unit}s
                          </span>
                          {isLow && (
                            <div className="text-[10px] text-amber-600 font-medium">Reorder Alert</div>
                          )}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹{firstBatch ? firstBatch.sellingPrice : 0}
                          <div className="text-[10px] text-slate-400 line-through">
                            MRP ₹{firstBatch ? firstBatch.mrp : 0}
                          </div>
                        </td>

                        {isOwner && (
                          <td className="p-3 text-right font-mono text-slate-600">
                            ₹{firstBatch ? firstBatch.purchaseRate : 0}
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              {firstBatch && firstBatch.purchaseRate > 0
                                ? `+${(
                                    ((firstBatch.sellingPrice - firstBatch.purchaseRate) /
                                      firstBatch.purchaseRate) *
                                    100
                                  ).toFixed(0)}% margin`
                                : ''}
                            </div>
                          </td>
                        )}

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setProductToEdit(p);
                                setIsAddEditOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                              title="Edit Medicine & Batches"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {isOwner && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete ${p.name} from inventory? This cannot be undone.`)) {
                                    onDeleteProduct(p.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Delete Medicine"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Batches Expanded Accordion View */}
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={9} className="p-4 border-t border-b border-amber-200">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                <span>Batch Breakdown for {p.name} (Sorted by FEFO: First Expiry First Out)</span>
                                <span className="text-[11px] text-slate-500">Barcode: <strong className="font-mono">{p.barcode}</strong></span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {fefoBatches.map((b, bIdx) => {
                                  const days = getDaysUntilExpiry(b.expiryDate);
                                  const alertLevel = getExpiryAlertLevel(b.expiryDate);

                                  return (
                                    <div
                                      key={b.id}
                                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                        alertLevel === 'expired'
                                          ? 'bg-rose-50/80 border-rose-300'
                                          : alertLevel === 'critical'
                                          ? 'bg-amber-50/80 border-amber-300'
                                          : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-900">
                                          Batch #{b.batchNumber}
                                        </span>
                                        {bIdx === 0 && days > 0 && (
                                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                            Recommended FEFO
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500">Expiry:</span>
                                        <span
                                          className={`font-mono font-semibold ${
                                            alertLevel === 'expired'
                                              ? 'text-rose-600'
                                              : alertLevel === 'critical'
                                              ? 'text-amber-600'
                                              : 'text-slate-700'
                                          }`}
                                        >
                                          {b.expiryDate} (
                                          {days <= 0
                                            ? `EXPIRED ${Math.abs(days)}d ago`
                                            : `${days} days left`}
                                          )
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500">Available Stock:</span>
                                        <span className="font-mono font-bold text-slate-900">
                                          {b.quantity} {p.unit}s
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                                        <span>MRP: <strong className="font-mono">₹{b.mrp}</strong></span>
                                        <span>Selling: <strong className="font-mono text-amber-700">₹{b.sellingPrice}</strong></span>
                                        {isOwner && <span>Cost: <strong className="font-mono">₹{b.purchaseRate}</strong></span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddEditOpen && (
        <AddEditProductModal
          productToEdit={productToEdit}
          onSave={onSaveProduct}
          onClose={() => {
            setIsAddEditOpen(false);
            setProductToEdit(null);
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustmentOpen && (
        <StockAdjustmentModal
          products={products}
          onAdjustStock={onAdjustStock}
          onClose={() => setIsAdjustmentOpen(false)}
        />
      )}

      {/* Stock Audit Modal */}
      {isAuditOpen && (
        <StockAuditModal
          products={products}
          onApplyAudit={onApplyAudit}
          onClose={() => setIsAuditOpen(false)}
        />
      )}

    </div>
  );
};
