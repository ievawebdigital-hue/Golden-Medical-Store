'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ActiveUser,
  Batch,
  CartItem,
  Customer,
  PharmacySettings,
  Product,
  SaleInvoice,
} from '@/types/pharmacy';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  Clock,
  UserPlus,
  CheckCircle2,
  X,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  calculateCartTotals,
  getDaysUntilExpiry,
  getExpiryAlertLevel,
  getRecommendedFEFOBatch,
  getTodayDateString,
  getCurrentTimeString,
  generateUniqueId,
  getCurrentYear,
} from '@/lib/inventory-utils';
import { playBarcodeBeep, playSuccessChime, playWarningBuzzer } from '@/lib/audio';
import { ThermalInvoiceModal } from './ThermalInvoiceModal';
import { ReturnModal } from './ReturnModal';

interface PosScreenProps {
  products: Product[];
  customers: Customer[];
  settings: PharmacySettings;
  activeUser: ActiveUser;
  invoices: SaleInvoice[];
  onCompleteSale: (invoice: SaleInvoice) => void;
  onCompleteReturn: (
    invoice: SaleInvoice,
    returnedItems: any[],
    refundMode: 'Cash' | 'Credit Note' | 'UPI',
    reasonNotes: string
  ) => void;
  onAddCustomer: (customer: Customer) => void;
  onOpenAiAssistantWithCart: (cart: CartItem[]) => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  products,
  customers,
  settings,
  activeUser,
  invoices,
  onCompleteSale,
  onCompleteReturn,
  onAddCustomer,
  onOpenAiAssistantWithCart,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [walkinName, setWalkinName] = useState('Walk-in Customer');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Due' | 'Split'>('Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Return modal state
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  // Active printed invoice modal
  const [activeInvoiceForPrint, setActiveInvoiceForPrint] = useState<SaleInvoice | null>(null);

  // Quick Customer Add Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Expired item override modal
  const [expiredOverrideItem, setExpiredOverrideItem] = useState<{
    product: Product;
    batch: Batch;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cartTotals = calculateCartTotals(cart);

  // Barcode Instant Lookup handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search by exact barcode first
    const matchByBarcode = products.find(
      (p) => p.barcode === searchQuery.trim()
    );

    if (matchByBarcode) {
      addItemToCart(matchByBarcode);
      playBarcodeBeep();
      setSearchQuery('');
      return;
    }

    // If single match found by text, add it
    const matches = filteredProducts;
    if (matches.length === 1) {
      addItemToCart(matches[0]);
      playBarcodeBeep();
      setSearchQuery('');
    }
  };

  // Add Item to Cart with FEFO auto-selection and expiry safety check
  const addItemToCart = (product: Product, chosenBatch?: Batch) => {
    const batch = chosenBatch || getRecommendedFEFOBatch(product);

    if (!batch) {
      alert(`No batch stock available for ${product.name}`);
      playWarningBuzzer();
      return;
    }

    // Safety check: is batch expired?
    const daysLeft = getDaysUntilExpiry(batch.expiryDate);
    if (daysLeft <= 0) {
      if (!settings.allowExpiredOverride) {
        alert(`SAFETY LOCK: Batch ${batch.batchNumber} of ${product.name} has EXPIRED (${batch.expiryDate}). Selling expired medicine is strictly prohibited by law.`);
        playWarningBuzzer();
        return;
      } else {
        // Prompt admin override
        setExpiredOverrideItem({ product, batch });
        return;
      }
    }

    // Check if already in cart
    const existingIndex = cart.findIndex(
      (it) => it.productId === product.id && it.batchId === batch.id
    );

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      if (existing.quantity >= batch.quantity) {
        alert(`Cannot add more: Max available stock for batch ${batch.batchNumber} is ${batch.quantity}.`);
        playWarningBuzzer();
        return;
      }
      const updated = [...cart];
      updated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1,
      };
      setCart(updated);
      playBarcodeBeep();
    } else {
      if (batch.quantity <= 0) {
        alert(`Batch ${batch.batchNumber} has 0 stock.`);
        playWarningBuzzer();
        return;
      }
      const newItem: CartItem = {
        productId: product.id,
        batchId: batch.id,
        name: product.name,
        brand: product.brand,
        genericName: product.genericName,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        mrp: batch.mrp,
        unitPrice: batch.sellingPrice,
        gstRate: batch.gstRate,
        quantity: 1,
        maxQuantity: batch.quantity,
        discountPercent: 0,
        packSize: product.packSize,
        rackLocation: product.rackLocation,
        prescriptionRequired: product.prescriptionRequired,
        purchaseRate: batch.purchaseRate,
      };
      setCart((prev) => [...prev, newItem]);
      playBarcodeBeep();
    }
  };

  const handleUpdateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.maxQuantity) {
      alert(`Maximum stock available for this batch is ${item.maxQuantity}`);
      newQty = item.maxQuantity;
    }
    const updated = [...cart];
    updated[index] = { ...item, quantity: newQty };
    setCart(updated);
  };

  const handleUpdateCartDiscount = (index: number, disc: number) => {
    if (disc < 0) disc = 0;
    if (disc > 100) disc = 100;
    const updated = [...cart];
    updated[index] = { ...updated[index], discountPercent: disc };
    setCart(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Clear the current billing cart?')) {
      setCart([]);
    }
  };

  const handleOpenCheckout = React.useCallback(() => {
    if (cart.length === 0) return;

    // Check if prescription required items exist and warn
    const hasRx = cart.some((it) => it.prescriptionRequired);
    if (hasRx && !doctorName.trim()) {
      const confirmRx = confirm(
        '⚠️ Warning: Cart includes Schedule H / Prescription-required medicines (e.g. Antibiotics or Injectables) without a Doctor Name entered.\n\nDo you want to proceed anyway?'
      );
      if (!confirmRx) return;
    }

    setAmountPaid(cartTotals.grandTotal);
    setCashTendered(cartTotals.grandTotal);
    setIsCheckoutOpen(true);
  }, [cart, doctorName, cartTotals.grandTotal]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F3 or '/' to search
      if (e.key === 'F3' || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F2 to focus barcode
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      // F8 to checkout if cart has items
      if (e.key === 'F8' && cart.length > 0 && !isCheckoutOpen) {
        e.preventDefault();
        handleOpenCheckout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, isCheckoutOpen, handleOpenCheckout]);

  const handleFinalizeBill = () => {
    const custName = selectedCustomer ? selectedCustomer.name : walkinName;
    const custPhone = selectedCustomer ? selectedCustomer.phone : walkinPhone;

    // Validate due payment
    let paid = amountPaid;
    let due = 0;

    if (paymentMode === 'Due') {
      paid = 0;
      due = cartTotals.grandTotal;
      if (!selectedCustomer) {
        alert('Please select a registered customer for Credit / Due (Udhaar) billing.');
        playWarningBuzzer();
        return;
      }
    } else if (paymentMode === 'Cash') {
      paid = cartTotals.grandTotal;
      due = 0;
    } else if (paymentMode === 'Split') {
      if (paid > cartTotals.grandTotal) paid = cartTotals.grandTotal;
      due = cartTotals.grandTotal - paid;
    }

    const nextInvoiceNum = `GMS-${getCurrentYear()}-${String(
      invoices.length + 1001
    )}`;

    const newInvoice: SaleInvoice = {
      id: generateUniqueId('inv'),
      invoiceNumber: nextInvoiceNum,
      date: getTodayDateString(),
      time: getCurrentTimeString(),
      customerId: selectedCustomer?.id,
      customerName: custName,
      customerPhone: custPhone,
      customerAddress: selectedCustomer?.address,
      doctorName: doctorName.trim() || undefined,
      prescriptionNotes: prescriptionNotes.trim() || undefined,
      items: [...cart],
      subtotal: cartTotals.subtotal,
      totalDiscount: cartTotals.totalDiscount,
      taxableAmount: cartTotals.taxableAmount,
      cgstAmount: cartTotals.cgstAmount,
      sgstAmount: cartTotals.sgstAmount,
      totalGst: cartTotals.totalGst,
      roundOff: cartTotals.roundOff,
      grandTotal: cartTotals.grandTotal,
      paymentMode,
      amountPaid: paid,
      amountDue: due,
      cashTendered: paymentMode === 'Cash' ? cashTendered : undefined,
      cashChange:
        paymentMode === 'Cash' && cashTendered > cartTotals.grandTotal
          ? cashTendered - cartTotals.grandTotal
          : 0,
      cashierName: activeUser.name,
      cashierRole: activeUser.role,
      status: 'completed',
    };

    onCompleteSale(newInvoice);
    playSuccessChime();

    // Reset bill state and show thermal modal
    setIsCheckoutOpen(false);
    setCart([]);
    setSelectedCustomer(null);
    setWalkinName('Walk-in Customer');
    setWalkinPhone('');
    setDoctorName('');
    setPrescriptionNotes('');
    setActiveInvoiceForPrint(newInvoice);
  };

  // Quick Customer Creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Customer Name and Mobile are required');
      return;
    }
    const newCust: Customer = {
      id: generateUniqueId('cust'),
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      medicalNotes: newCustNotes.trim(),
      totalPurchases: 0,
      currentDue: 0,
      loyaltyPoints: 0,
      createdAt: getTodayDateString(),
    };
    onAddCustomer(newCust);
    setSelectedCustomer(newCust);
    setIsAddCustomerOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustNotes('');
  };

  // Filter products by search text and category
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

    return matchesSearch && matchesCategory;
  });

  const categories = [
    'All',
    'Tablet',
    'Capsule',
    'Syrup',
    'Injection',
    'Ointment',
    'Drops',
    'Surgical',
    'General',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm">Counter Billing</span>
          <span className="text-xs text-slate-500">· Cashier: <strong>{activeUser.name}</strong></span>
          <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
            Shortcut: <kbd className="font-bold">F3</kbd> Search · <kbd className="font-bold">F8</kbd> Bill
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReturnOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Sales Return / Refund</span>
          </button>

          {cart.length > 0 && (
            <button
              onClick={() => onOpenAiAssistantWithCart(cart)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Check Drug Interactions ({cart.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Grid: Medicine Catalog (Left) + Billing Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Search & Medicine Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barcode & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <form onSubmit={handleBarcodeSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan Barcode or Search Medicine, Generic salt, Brand, Rack (Press / or F3)"
                className="w-full pl-9 pr-24 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded shadow-sm"
                >
                  <Barcode className="w-3 h-3" />
                  <span>Scan</span>
                </button>
              </div>
            </form>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-amber-400 font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Medicines Grid / List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No medicines match your search</p>
                <p className="text-xs text-slate-500">
                  Try searching by generic salt (e.g. Paracetamol, Amoxicillin) or check spelling.
                </p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const totalStock = prod.batches.reduce((sum, b) => sum + b.quantity, 0);
                const isLowStock = totalStock <= prod.minStockLevel;
                const recommendedBatch = getRecommendedFEFOBatch(prod);
                const daysLeft = recommendedBatch ? getDaysUntilExpiry(recommendedBatch.expiryDate) : 999;
                const expiryAlert = recommendedBatch ? getExpiryAlertLevel(recommendedBatch.expiryDate) : 'safe';

                return (
                  <div
                    key={prod.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 transition-all shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    {/* Medicine details */}
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{prod.name}</span>
                        {prod.prescriptionRequired && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                            Rx (Sched H)
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">· {prod.packSize}</span>
                        <span className="text-[11px] text-amber-700 font-medium">📍 {prod.rackLocation}</span>
                      </div>

                      <div className="text-xs text-slate-600 line-clamp-1">
                        <strong className="text-slate-700">Salt:</strong> {prod.genericName}
                      </div>

                      {/* Batches & FEFO indicator */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                        <span>Brand: {prod.brand}</span>
                        <span>·</span>
                        {recommendedBatch && (
                          <span
                            className={`font-mono ${
                              expiryAlert === 'expired'
                                ? 'text-rose-600 font-bold'
                                : expiryAlert === 'critical'
                                ? 'text-amber-600 font-semibold'
                                : 'text-slate-600'
                            }`}
                          >
                            FEFO Batch: <strong>{recommendedBatch.batchNumber}</strong> (Exp: {recommendedBatch.expiryDate.substring(0, 7)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock, Price and Add Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 font-mono">
                          ₹{recommendedBatch?.sellingPrice || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 line-through">
                          MRP ₹{recommendedBatch?.mrp || 0}
                        </div>
                        <div
                          className={`text-[10px] font-semibold ${
                            totalStock <= 0
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          Stock: {totalStock} {prod.unit}s
                        </div>
                      </div>

                      {/* Batch Selector if multiple batches exist */}
                      {prod.batches.length > 1 ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => addItemToCart(prod, recommendedBatch || undefined)}
                            disabled={totalStock <= 0}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addItemToCart(prod)}
                          disabled={totalStock <= 0}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Active Cart & Fast Billing (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          
          {/* Customer & Prescriber Header */}
          <div className="space-y-3 pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Customer / Patient Details
              </span>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-semibold"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ New Customer</span>
              </button>
            </div>

            {/* Customer Picker */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCustomer?.id || 'walkin'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'walkin') {
                    setSelectedCustomer(null);
                  } else {
                    const found = customers.find((c) => c.id === val);
                    setSelectedCustomer(found || null);
                  }
                }}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="walkin">Walk-in Customer (Instant Counter)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.currentDue > 0 ? `[Due: ₹${c.currentDue}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* If selected registered customer, show due and points */}
            {selectedCustomer && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-amber-950 font-semibold">{selectedCustomer.name}</span>
                  <span className="font-mono text-amber-900">{selectedCustomer.phone}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Outstanding Due: <strong className="text-rose-700 font-mono">₹{selectedCustomer.currentDue}</strong></span>
                  <span>Points: <strong className="text-emerald-700 font-mono">{selectedCustomer.loyaltyPoints}</strong></span>
                </div>
                {selectedCustomer.medicalNotes && (
                  <div className="text-[10px] text-amber-800 italic">
                    Medical note: {selectedCustomer.medicalNotes}
                  </div>
                )}
              </div>
            )}

            {/* Doctor Name & Prescription notes */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Doctor Name (Dr. ...)"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  placeholder="Rx / Dosage notes"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                Cart Items ({cart.length})
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-rose-600 hover:text-rose-700 text-[11px] font-medium"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-1">
                  <p className="text-xs">No medicines added to bill yet.</p>
                  <p className="text-[11px] text-slate-400">Scan barcode or click &quot;+ Add&quot; from medicine list</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.productId}_${item.batchId}`}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 leading-tight">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Batch: {item.batchNumber} · Exp: {item.expiryDate.substring(0, 7)} · GST: {item.gstRate}%
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(idx, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.maxQuantity}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateCartQty(idx, parseInt(e.target.value) || 1)
                          }
                          className="w-12 text-center py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(idx, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-slate-500 pl-1 font-mono">
                          (Max: {item.maxQuantity})
                        </span>
                      </div>

                      {/* Disc % and Line Total */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-[11px] text-slate-500">
                          <span>Disc:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) =>
                              handleUpdateCartDiscount(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-10 text-center py-0.5 bg-white border border-slate-300 rounded font-mono text-xs"
                          />
                          <span>%</span>
                        </div>
                        <div className="font-bold text-slate-900 font-mono text-right min-w-[60px]">
                          ₹{(item.quantity * item.unitPrice * (1 - item.discountPercent / 100)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Billing Calculations */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums">₹{cartTotals.subtotal.toFixed(2)}</span>
            </div>

            {cartTotals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono tabular-nums">-₹{cartTotals.totalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Taxable Value:</span>
              <span className="font-mono tabular-nums">₹{cartTotals.taxableAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Total GST (CGST + SGST):</span>
              <span className="font-mono tabular-nums">₹{cartTotals.totalGst.toFixed(2)}</span>
            </div>

            {cartTotals.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Round off:</span>
                <span className="font-mono tabular-nums">
                  {cartTotals.roundOff > 0 ? `+₹${cartTotals.roundOff}` : `-₹${Math.abs(cartTotals.roundOff)}`}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-xl text-amber-600">
                ₹{cartTotals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Checkout CTA */}
          <button
            type="button"
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Proceed to Payment (F8)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Checkout & Payment Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base">Complete Billing & Payment</h3>
                <p className="text-xs text-slate-400">Total Payable: ₹{cartTotals.grandTotal}</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('Cash');
                      setAmountPaid(cartTotals.grandTotal);
                      setCashTendered(cartTotals.grandTotal);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                      paymentMode === 'Cash'
                        ? 'bg-amber-500 border-amber-600 text-slate-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-5 h-5 mb-1" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('UPI');
                      setAmountPaid(cartTotals.grandTotal);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                      paymentMode === 'UPI'
                        ? 'bg-amber-500 border-amber-600 text-slate-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mb-1" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('Card');
                      setAmountPaid(cartTotals.grandTotal);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                      paymentMode === 'Card'
                        ? 'bg-amber-500 border-amber-600 text-slate-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1" />
                    <span>Card / POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('Due');
                      setAmountPaid(0);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                      paymentMode === 'Due'
                        ? 'bg-amber-500 border-amber-600 text-slate-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-5 h-5 mb-1" />
                    <span>Credit / Due</span>
                  </button>
                </div>
              </div>

              {/* Cash Tendered & Change Helper */}
              {paymentMode === 'Cash' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Cash Received from Customer:</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-right"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500">Fast Cash:</span>
                    {[
                      cartTotals.grandTotal,
                      Math.ceil(cartTotals.grandTotal / 100) * 100,
                      500,
                      1000,
                      2000,
                    ].map((noteVal, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCashTendered(noteVal)}
                        className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-amber-100 text-[10px] font-mono font-semibold rounded text-slate-700"
                      >
                        ₹{noteVal}
                      </button>
                    ))}
                  </div>

                  {/* Change Calculator */}
                  <div className="flex justify-between items-center pt-2 border-t border-amber-200 text-xs">
                    <span className="font-bold text-slate-700">Return Change to Customer:</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        cashTendered >= cartTotals.grandTotal
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {cashTendered >= cartTotals.grandTotal
                        ? `₹${(cashTendered - cartTotals.grandTotal).toFixed(2)}`
                        : `Short by ₹${(cartTotals.grandTotal - cashTendered).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* UPI Instant QR Code View */}
              {paymentMode === 'UPI' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-2">
                  <p className="text-xs text-slate-600 font-medium">
                    Customer can scan via Google Pay, PhonePe, or Paytm:
                  </p>
                  <div className="w-36 h-36 mx-auto bg-white border-2 border-slate-800 rounded-lg flex flex-col items-center justify-center p-2 shadow-inner">
                    <QrCode className="w-24 h-24 text-slate-900" />
                    <span className="text-[10px] font-mono text-slate-600">upi://pay?am={cartTotals.grandTotal}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 font-mono">
                    UPI ID: goldenmed@icici · Amount: ₹{cartTotals.grandTotal}
                  </div>
                </div>
              )}

              {/* Due / Udhaar confirmation note */}
              {paymentMode === 'Due' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-amber-900">Credit / Udhaar Billing</div>
                  <p className="text-amber-800 text-[11px]">
                    This invoice will be marked as unpaid. An amount of <strong>₹{cartTotals.grandTotal}</strong> will be added to <strong>{selectedCustomer?.name || 'Customer'}</strong>&apos;s due ledger.
                  </p>
                </div>
              )}

              {/* Finalize Button */}
              <button
                type="button"
                onClick={handleFinalizeBill}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Save Bill & Print Invoice (₹{cartTotals.grandTotal})</span>
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Quick Customer Add Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">Add New Customer</h3>
              <button onClick={() => setIsAddCustomerOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9812345678"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. B-12, Green Park"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medical History / Allergies</label>
                <input
                  type="text"
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  placeholder="e.g. Diabetic, Penicillin allergic"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expired Item Safety Override Modal */}
      {expiredOverrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-rose-300 p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 border-b pb-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-sm">Expired Medicine Safety Warning</h3>
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <p>
                <strong>{expiredOverrideItem.product.name}</strong> batch{' '}
                <strong className="font-mono">{expiredOverrideItem.batch.batchNumber}</strong> expired on{' '}
                <strong className="text-rose-600">{expiredOverrideItem.batch.expiryDate}</strong>.
              </p>
              <p className="text-[11px] text-slate-500">
                Dispensing expired pharmaceutical products is illegal under the Drugs and Cosmetics Act. Override is only permitted for testing or return/destruction purposes.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Override Reason & Authorization Note:
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Authorized laboratory testing / demo"
                className="w-full p-2 bg-slate-50 border rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpiredOverrideItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel (Block Sale)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!overrideReason.trim()) {
                    alert('Please provide an override explanation.');
                    return;
                  }
                  // Allow item
                  const { product, batch } = expiredOverrideItem;
                  const newItem: CartItem = {
                    productId: product.id,
                    batchId: batch.id,
                    name: `[EXPIRED] ${product.name}`,
                    brand: product.brand,
                    genericName: product.genericName,
                    batchNumber: batch.batchNumber,
                    expiryDate: batch.expiryDate,
                    mrp: batch.mrp,
                    unitPrice: batch.sellingPrice,
                    gstRate: batch.gstRate,
                    quantity: 1,
                    maxQuantity: batch.quantity,
                    discountPercent: 0,
                    packSize: product.packSize,
                    rackLocation: product.rackLocation,
                    prescriptionRequired: product.prescriptionRequired,
                    purchaseRate: batch.purchaseRate,
                  };
                  setCart((prev) => [...prev, newItem]);
                  setExpiredOverrideItem(null);
                  setOverrideReason('');
                }}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 font-bold text-white rounded"
              >
                Authorize Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal & A4 Invoice View Modal */}
      {activeInvoiceForPrint && (
        <ThermalInvoiceModal
          invoice={activeInvoiceForPrint}
          settings={settings}
          onClose={() => setActiveInvoiceForPrint(null)}
        />
      )}

      {/* Sales Return Modal */}
      {isReturnOpen && (
        <ReturnModal
          invoices={invoices}
          onCompleteReturn={onCompleteReturn}
          onClose={() => setIsReturnOpen(false)}
        />
      )}

    </div>
  );
};
