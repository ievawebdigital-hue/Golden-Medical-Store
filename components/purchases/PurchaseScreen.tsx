'use client';

import React, { useState } from 'react';
import {
  ActiveUser,
  Product,
  PurchaseBill,
  PurchaseItem,
  Supplier,
} from '@/types/pharmacy';
import {
  Truck,
  Plus,
  FilePlus,
  Building2,
  DollarSign,
  Calendar,
  X,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { getTodayDateString, generateUniqueId, getCurrentYear } from '@/lib/inventory-utils';
import { playSuccessChime } from '@/lib/audio';

interface PurchaseScreenProps {
  suppliers: Supplier[];
  products: Product[];
  purchases: PurchaseBill[];
  activeUser: ActiveUser;
  onSavePurchaseBill: (bill: PurchaseBill) => void;
  onAddSupplier: (supplier: Supplier) => void;
  onRecordSupplierPayment: (supplierId: string, amount: number) => void;
}

export const PurchaseScreen: React.FC<PurchaseScreenProps> = ({
  suppliers,
  products,
  purchases,
  activeUser,
  onSavePurchaseBill,
  onAddSupplier,
  onRecordSupplierPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'bills' | 'suppliers'>('bills');

  // New Purchase Bill Modal State
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [billDate, setBillDate] = useState(getTodayDateString());
  const [billItems, setBillItems] = useState<PurchaseItem[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Due'>('Paid');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Item row form inside new bill
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState(getTodayDateString().substring(0, 7));
  const [expiryDate, setExpiryDate] = useState('2028-12-31');
  const [quantity, setQuantity] = useState<number>(50);
  const [purchaseRate, setPurchaseRate] = useState<number>(50);
  const [mrp, setMrp] = useState<number>(85);
  const [sellingPrice, setSellingPrice] = useState<number>(80);
  const [gstRate, setGstRate] = useState<number>(12);

  // New Supplier Modal State
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supTerms, setSupTerms] = useState('Net 30 Days');
  const [supDue, setSupDue] = useState<number>(0);

  // Pay Supplier Modal
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);

  // Calculations for current purchase bill
  const billSubtotal = billItems.reduce((sum, it) => sum + it.purchaseRate * it.quantity, 0);
  const billGst = billItems.reduce(
    (sum, it) => sum + (it.purchaseRate * it.quantity * it.gstRate) / 100,
    0
  );
  const billGrandTotal = Math.round(billSubtotal + billGst);

  const handleAddItemToBill = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;
    if (!batchNumber.trim()) {
      alert('Batch Number is required');
      return;
    }

    const newItem: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      batchNumber: batchNumber.trim().toUpperCase(),
      mfgDate,
      expiryDate,
      quantity,
      purchaseRate,
      mrp,
      sellingPrice,
      gstRate,
      totalAmount: Math.round(purchaseRate * quantity * (1 + gstRate / 100)),
    };

    setBillItems([...billItems, newItem]);
    // Reset batch form
    setBatchNumber('');
    setQuantity(50);
  };

  const handleRemoveBillItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const handleSavePurchaseBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (billItems.length === 0) {
      alert('Please add at least one medicine item to this purchase bill.');
      return;
    }
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) {
      alert('Please select a supplier');
      return;
    }

    const nextBillNo = `PB-${getCurrentYear()}-${String(
      purchases.length + 101
    )}`;

    const newBill: PurchaseBill = {
      id: generateUniqueId('pb'),
      billNumber: nextBillNo,
      supplierInvoiceNumber: supplierInvoiceNumber.trim() || `DIST-${generateUniqueId('inv').slice(-4)}`,
      supplierId: sup.id,
      supplierName: sup.name,
      billDate,
      items: billItems,
      subtotal: billSubtotal,
      totalGst: billGst,
      grandTotal: billGrandTotal,
      amountPaid: paymentStatus === 'Paid' ? billGrandTotal : paymentStatus === 'Due' ? 0 : amountPaid,
      paymentStatus,
      notes,
    };

    onSavePurchaseBill(newBill);
    playSuccessChime();
    setIsNewBillOpen(false);
    setBillItems([]);
    setSupplierInvoiceNumber('');
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) {
      alert('Supplier Name and Phone are required');
      return;
    }
    const newSup: Supplier = {
      id: generateUniqueId('sup'),
      name: supName.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim() || undefined,
      address: supAddress.trim(),
      gstin: supGstin.trim(),
      paymentTerms: supTerms.trim(),
      currentDue: Number(supDue) || 0,
    };
    onAddSupplier(newSup);
    setIsNewSupplierOpen(false);
    setSupName('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupGstin('');
    setSupDue(0);
  };

  const handlePaySupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplier || payAmount <= 0) return;
    onRecordSupplierPayment(payingSupplier.id, payAmount);
    playSuccessChime();
    setPayingSupplier(null);
    setPayAmount(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Purchases & Supplier Management
          </h1>
          <p className="text-xs text-slate-500">
            Record distributor inward stock, auto-update batches, track supplier bills and dues
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'bills'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Purchase Bills ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'suppliers'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Suppliers & Dues ({suppliers.length})
            </button>
          </div>

          <button
            onClick={() => setIsNewSupplierOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Add Supplier</span>
          </button>

          <button
            onClick={() => {
              setSupplierId(suppliers[0]?.id || '');
              setBillItems([]);
              setIsNewBillOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <FilePlus className="w-4 h-4" />
            <span>+ Record Inward Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Purchase Bills List */}
      {activeTab === 'bills' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700 flex justify-between items-center">
            <span>Inward Purchase Bills History</span>
            <span className="text-slate-500 font-normal">
              Stock automatically increments in inventory upon saving
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Bill Number</th>
                  <th className="p-3">Distributor Invoice #</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Items Received</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">GST</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((pb) => (
                  <tr key={pb.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {pb.billNumber}
                    </td>
                    <td className="p-3 font-mono text-slate-700">
                      {pb.supplierInvoiceNumber}
                    </td>
                    <td className="p-3 font-medium text-slate-900">
                      {pb.supplierName}
                    </td>
                    <td className="p-3 text-slate-600">
                      {pb.billDate}
                    </td>
                    <td className="p-3 text-center font-mono">
                      {pb.items.length} medicines
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      ₹{pb.subtotal.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      ₹{pb.totalGst.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      ₹{pb.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pb.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pb.paymentStatus === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {pb.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Supplier Directory & Dues */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{sup.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">GSTIN: {sup.gstin}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Current Balance</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      sup.currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    ₹{sup.currentDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div>📞 {sup.phone}</div>
                {sup.email && <div>✉️ {sup.email}</div>}
                <div className="text-slate-500 line-clamp-1">📍 {sup.address}</div>
                <div className="text-[11px] text-slate-400">Payment Terms: {sup.paymentTerms}</div>
              </div>

              <div className="pt-2 border-t flex justify-end">
                {sup.currentDue > 0 && (
                  <button
                    onClick={() => {
                      setPayingSupplier(sup);
                      setPayAmount(sup.currentDue);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Pay Supplier Due</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Purchase Bill Inward Modal */}
      {isNewBillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base">Inward Purchase Bill Entry (Distributor)</h3>
                <p className="text-xs text-slate-400">
                  Stock will be automatically added to inventory batches
                </p>
              </div>
              <button onClick={() => setIsNewBillOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseBill} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* Bill Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border rounded-lg">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Distributor / Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full p-2 bg-white border rounded font-medium"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Distributor Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV/26/1042"
                    className="w-full p-2 bg-white border rounded font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full p-2 bg-white border rounded font-mono"
                  />
                </div>
              </div>

              {/* Add Item Row */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Add Medicine Batch to Bill
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 font-medium">Select Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setSelectedProductId(pId);
                        const found = products.find((p) => p.id === pId);
                        if (found && found.batches.length > 0) {
                          setPurchaseRate(found.batches[0].purchaseRate);
                          setMrp(found.batches[0].mrp);
                          setSellingPrice(found.batches[0].sellingPrice);
                          setGstRate(found.batches[0].gstRate);
                        }
                      }}
                      className="w-full p-1.5 bg-white border rounded font-medium"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.brand})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium">Batch Number *</label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="e.g. DL26M01"
                      className="w-full p-1.5 bg-white border rounded font-mono uppercase font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium">Mfg Date</label>
                    <input
                      type="month"
                      value={mfgDate}
                      onChange={(e) => setMfgDate(e.target.value)}
                      className="w-full p-1.5 bg-white border rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full p-1.5 bg-white border rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full p-1.5 bg-white border rounded font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium">Purchase Rate</label>
                    <input
                      type="number"
                      step="0.1"
                      value={purchaseRate}
                      onChange={(e) => setPurchaseRate(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-white border rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium">Selling Price</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 bg-white border rounded font-mono font-bold text-amber-700"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItemToBill}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded shadow-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Items in Bill */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 p-2 font-bold text-slate-700 uppercase tracking-wider text-[10px] grid grid-cols-12">
                  <span className="col-span-5">Product / Batch</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Cost</span>
                  <span className="col-span-2 text-right">Total (Incl GST)</span>
                  <span className="col-span-1 text-center">Action</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {billItems.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      No items added to bill yet. Use the form above to add medicines.
                    </div>
                  ) : (
                    billItems.map((it, idx) => (
                      <div key={idx} className="p-2 grid grid-cols-12 items-center text-xs">
                        <div className="col-span-5">
                          <div className="font-semibold text-slate-900">{it.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Batch: {it.batchNumber} · Exp: {it.expiryDate}
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-mono font-bold">
                          {it.quantity}
                        </div>
                        <div className="col-span-2 text-right font-mono">
                          ₹{it.purchaseRate.toFixed(2)}
                        </div>
                        <div className="col-span-2 text-right font-mono font-bold text-slate-900">
                          ₹{it.totalAmount.toFixed(2)}
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveBillItem(idx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bill Totals & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Status to Distributor</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Paid', 'Partial', 'Due'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPaymentStatus(st)}
                        className={`py-1.5 rounded font-semibold text-xs border ${
                          paymentStatus === st
                            ? 'bg-amber-500 border-amber-600 text-slate-950'
                            : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {paymentStatus === 'Partial' && (
                    <div className="mt-2">
                      <label className="block text-[11px] text-slate-600 mb-0.5">Amount Paid Now (₹):</label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-50 border rounded font-mono font-bold"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg flex flex-col justify-between">
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal (Cost):</span>
                      <span className="font-mono">₹{billSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Input GST:</span>
                      <span className="font-mono">₹{billGst.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm font-bold">
                    <span>Grand Total:</span>
                    <span className="font-mono text-amber-400 text-base">
                      ₹{billGrandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewBillOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={billItems.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg shadow-sm"
                >
                  Save Inward Bill & Increase Stock
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isNewSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">Add New Distributor / Supplier</h3>
              <button onClick={() => setIsNewSupplierOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Apex Pharma Distributors"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={supGstin}
                    onChange={(e) => setSupGstin(e.target.value)}
                    placeholder="07AAAAA..."
                    className="w-full p-2 bg-slate-50 border rounded-lg font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Warehouse address"
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={supTerms}
                    onChange={(e) => setSupTerms(e.target.value)}
                    placeholder="Net 30 Days"
                    className="w-full p-2 bg-slate-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Due (₹)</label>
                  <input
                    type="number"
                    value={supDue}
                    onChange={(e) => setSupDue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {payingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">Record Supplier Payment</h3>
              <button onClick={() => setPayingSupplier(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handlePaySupplierSubmit} className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Distributor:</span>
                <div className="font-bold text-slate-900 text-sm">{payingSupplier.name}</div>
                <div className="text-[11px] text-rose-600 font-mono">
                  Outstanding Due: ₹{payingSupplier.currentDue.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Settle (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={payingSupplier.currentDue}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono font-bold text-sm text-slate-900 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingSupplier(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
