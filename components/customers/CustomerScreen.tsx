'use client';

import React, { useState } from 'react';
import { Customer, SaleInvoice } from '@/types/pharmacy';
import {
  Users,
  UserPlus,
  DollarSign,
  Share2,
  Clock,
  Search,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';
import { playSuccessChime } from '@/lib/audio';
import { generateUniqueId, getTodayDateString } from '@/lib/inventory-utils';

interface CustomerScreenProps {
  customers: Customer[];
  invoices: SaleInvoice[];
  onAddCustomer: (customer: Customer) => void;
  onCollectCustomerDue: (customerId: string, amount: number) => void;
  onViewInvoice: (invoice: SaleInvoice) => void;
}

export const CustomerScreen: React.FC<CustomerScreenProps> = ({
  customers,
  invoices,
  onAddCustomer,
  onCollectCustomerDue,
  onViewInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Add Customer modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Collect Due Modal
  const [collectingCustomer, setCollectingCustomer] = useState<Customer | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMode, setCollectMode] = useState<'Cash' | 'UPI' | 'Card'>('Cash');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalMarketDue = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const newCust: Customer = {
      id: generateUniqueId('cust'),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      medicalNotes: notes.trim(),
      totalPurchases: 0,
      currentDue: 0,
      loyaltyPoints: 0,
      createdAt: getTodayDateString(),
    };

    onAddCustomer(newCust);
    playSuccessChime();
    setIsAddOpen(false);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
  };

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingCustomer || collectAmount <= 0) return;
    onCollectCustomerDue(collectingCustomer.id, collectAmount);
    playSuccessChime();
    setCollectingCustomer(null);
    setCollectAmount(0);
  };

  const handleSendWhatsAppReminder = (cust: Customer) => {
    const text = encodeURIComponent(
      `Hello ${cust.name},\n\nThis is a polite reminder from *Golden Medical Store* regarding your outstanding medicine balance of *₹${cust.currentDue}*.\n\nYou can settle via UPI or cash at our pharmacy counter.\n\nThank you!\n*Golden Medical Store*\nPh: +91 98765 43210`
    );
    window.open(`https://wa.me/91${cust.phone.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  // Get invoices for the selected customer
  const customerInvoices = selectedCustomer
    ? invoices.filter((inv) => inv.customerId === selectedCustomer.id)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Customer Directory & Credit (Udhaar) Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Track customer purchase history, outstanding dues, loyalty points, and WhatsApp reminders
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Registered Patients/Customers</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {customers.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-700 font-semibold">Total Outstanding Dues (Udhaar)</span>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-0.5">
              ₹{totalMarketDue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Customer Lifetime Sales</span>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-0.5">
              ₹{customers.reduce((s, c) => s + c.totalPurchases, 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by customer name, mobile number, or address..."
          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Split Grid: Customers List + Customer Ledger Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Customer Directory Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b font-semibold text-xs text-slate-700">
            Customers List ({filteredCustomers.length})
          </div>

          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No customers match your search query.
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className={`p-3 hover:bg-amber-50/50 cursor-pointer transition-colors text-xs flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-amber-50/80 border-l-4 border-amber-500' : ''
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{cust.name}</span>
                        <span className="font-mono text-slate-500">📞 {cust.phone}</span>
                      </div>
                      {cust.medicalNotes && (
                        <div className="text-[11px] text-amber-800 line-clamp-1 italic">
                          Med notes: {cust.medicalNotes}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        Total Purchases: ₹{cust.totalPurchases.toLocaleString()} · Points: {cust.loyaltyPoints}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Due Balance</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            cust.currentDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          ₹{cust.currentDue}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 justify-end">
                        {cust.currentDue > 0 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCollectingCustomer(cust);
                                setCollectAmount(cust.currentDue);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold rounded"
                            >
                              Collect Due
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendWhatsAppReminder(cust);
                              }}
                              className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded"
                              title="Send WhatsApp Due Reminder"
                            >
                              <Share2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Customer Ledger & History Detail (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          {selectedCustomer ? (
            <div className="space-y-3 text-xs">
              <div className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900">{selectedCustomer.name}</h3>
                  <span
                    className={`font-mono font-bold text-sm ${
                      selectedCustomer.currentDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    Due: ₹{selectedCustomer.currentDue}
                  </span>
                </div>
                <p className="text-slate-500 font-mono mt-0.5">📞 {selectedCustomer.phone}</p>
                {selectedCustomer.address && (
                  <p className="text-slate-600 mt-1">📍 {selectedCustomer.address}</p>
                )}
                {selectedCustomer.medicalNotes && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
                    <strong>Medical Profile:</strong> {selectedCustomer.medicalNotes}
                  </div>
                )}
              </div>

              {/* Purchase Bills for Customer */}
              <div className="space-y-2">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Purchase Bill History ({customerInvoices.length})
                </div>

                {customerInvoices.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 border border-dashed rounded-lg">
                    No previous invoices for this customer.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {customerInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 bg-slate-50 border rounded-lg flex items-center justify-between hover:bg-slate-100 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            #{inv.invoiceNumber}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {inv.date} · Paid: {inv.paymentMode} ({inv.items.length} items)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900">
                            ₹{inv.grandTotal}
                          </div>
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="text-[10px] text-amber-700 hover:underline font-semibold"
                          >
                            View Bill →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-1 text-xs">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No customer selected</p>
              <p className="text-slate-400">Click any customer on the left to view their detailed purchase ledger and medical notes.</p>
            </div>
          )}
        </div>

      </div>

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">Register New Customer</h3>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alok Mishra"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9812345678"
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Locality</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Pocket 4, Mayur Vihar"
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medical Conditions & Allergies</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Hypertension, Diabetic, Allergic to Sulfa"
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Due Payment Modal */}
      {collectingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">Collect Outstanding Due</h3>
              <button onClick={() => setCollectingCustomer(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCollectSubmit} className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Customer:</span>
                <div className="font-bold text-slate-900 text-sm">{collectingCustomer.name}</div>
                <div className="text-[11px] text-rose-600 font-mono">
                  Outstanding Due: ₹{collectingCustomer.currentDue}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['Cash', 'UPI', 'Card'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCollectMode(m)}
                      className={`py-1.5 rounded font-semibold text-xs border ${
                        collectMode === m
                          ? 'bg-amber-500 border-amber-600 text-slate-950'
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Collected (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={collectingCustomer.currentDue}
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border rounded-lg font-mono font-bold text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCollectingCustomer(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded"
                >
                  Record Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
