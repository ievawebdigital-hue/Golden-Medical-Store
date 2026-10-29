'use client';

import React, { useState } from 'react';
import { Customer, Product, PurchaseBill, SaleInvoice, Supplier } from '@/types/pharmacy';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  PackageX,
  CreditCard,
  Banknote,
  QrCode,
  DollarSign,
  Printer,
} from 'lucide-react';
import { getDaysUntilExpiry, getTodayDateString } from '@/lib/inventory-utils';

interface ReportsDashboardProps {
  invoices: SaleInvoice[];
  products: Product[];
  purchases: PurchaseBill[];
  customers: Customer[];
  suppliers: Supplier[];
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  invoices,
  products,
  purchases,
  customers,
  suppliers,
}) => {
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');

  const todayStr = getTodayDateString();

  // Filter invoices by timeframe
  const filteredInvoices = invoices.filter((inv) => {
    if (timeframe === 'all') return true;
    if (timeframe === 'today') return inv.date === todayStr;
    if (timeframe === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return inv.date === d.toISOString().split('T')[0];
    }
    if (timeframe === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return inv.date >= d.toISOString().split('T')[0];
    }
    if (timeframe === 'month') {
      return inv.date.substring(0, 7) === todayStr.substring(0, 7);
    }
    return true;
  });

  // Calculate Metrics
  let totalGrossSales = 0;
  let totalDiscountGiven = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalGstCollected = 0;
  let cashCollection = 0;
  let upiCollection = 0;
  let cardCollection = 0;
  let dueCreated = 0;
  let totalPurchaseCostOfSoldItems = 0;

  // Medicine product sales frequency
  const productSalesMap: Record<
    string,
    { name: string; brand: string; quantity: number; revenue: number }
  > = {};

  filteredInvoices.forEach((inv) => {
    totalGrossSales += inv.grandTotal;
    totalDiscountGiven += inv.totalDiscount;
    totalTaxable += inv.taxableAmount;
    totalCgst += inv.cgstAmount;
    totalSgst += inv.sgstAmount;
    totalGstCollected += inv.totalGst;

    if (inv.paymentMode === 'Cash') cashCollection += inv.amountPaid;
    else if (inv.paymentMode === 'UPI') upiCollection += inv.amountPaid;
    else if (inv.paymentMode === 'Card') cardCollection += inv.amountPaid;
    else if (inv.paymentMode === 'Due') dueCreated += inv.amountDue;
    else if (inv.paymentMode === 'Split') {
      cashCollection += inv.amountPaid;
      dueCreated += inv.amountDue;
    }

    inv.items.forEach((it) => {
      totalPurchaseCostOfSoldItems += (it.purchaseRate || 0) * it.quantity;
      if (!productSalesMap[it.productId]) {
        productSalesMap[it.productId] = {
          name: it.name,
          brand: it.brand,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesMap[it.productId].quantity += it.quantity;
      productSalesMap[it.productId].revenue += it.unitPrice * it.quantity * (1 - it.discountPercent / 100);
    });
  });

  const estimatedProfit = totalGrossSales - totalPurchaseCostOfSoldItems;
  const profitMarginPercent = totalGrossSales > 0 ? (estimatedProfit / totalGrossSales) * 100 : 0;
  const averageBillValue = filteredInvoices.length > 0 ? totalGrossSales / filteredInvoices.length : 0;

  // Top 10 Selling Medicines
  const topSellingMedicines = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Dead Stock / Slow Moving (Products that have had 0 sales in the selected period)
  const deadStockProducts = products
    .filter((p) => !productSalesMap[p.id])
    .slice(0, 8);

  // Expiry Risk: Total stock value expiring within 60 days
  let nearExpiryRiskValue = 0;
  let nearExpiryRiskBatches = 0;
  products.forEach((p) => {
    p.batches.forEach((b) => {
      const days = getDaysUntilExpiry(b.expiryDate);
      if (days <= 60 && b.quantity > 0) {
        nearExpiryRiskBatches++;
        nearExpiryRiskValue += b.quantity * b.purchaseRate;
      }
    });
  });

  const totalCustomerDues = customers.reduce((s, c) => s + (c.currentDue || 0), 0);
  const totalSupplierDues = suppliers.reduce((s, sup) => s + (sup.currentDue || 0), 0);

  const handleExportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Timeframe', timeframe],
      ['Total Gross Sales (INR)', totalGrossSales.toFixed(2)],
      ['Estimated Net Profit (INR)', estimatedProfit.toFixed(2)],
      ['Profit Margin (%)', `${profitMarginPercent.toFixed(1)}%`],
      ['Total Bills Issued', filteredInvoices.length.toString()],
      ['Average Bill Size (INR)', averageBillValue.toFixed(2)],
      ['Cash Collection (INR)', cashCollection.toFixed(2)],
      ['UPI Collection (INR)', upiCollection.toFixed(2)],
      ['Card Collection (INR)', cardCollection.toFixed(2)],
      ['Credit / Due Created (INR)', dueCreated.toFixed(2)],
      ['Taxable Sales Turnover (INR)', totalTaxable.toFixed(2)],
      ['CGST Collected (INR)', totalCgst.toFixed(2)],
      ['SGST Collected (INR)', totalSgst.toFixed(2)],
      ['Total GST Collected (INR)', totalGstCollected.toFixed(2)],
      ['Total Customer Dues (INR)', totalCustomerDues.toString()],
      ['Total Supplier Dues (INR)', totalSupplierDues.toString()],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map((r) => r.join(',')).join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `GoldenMedicalStore_Report_${timeframe}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      
      {/* Top Header & Timeframe Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Financial & Inventory Intelligence Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Real-time sales, net profit margins, GST sales reports, and dead-stock diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  timeframe === t.id
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report CSV</span>
          </button>
        </div>
      </div>

      {/* Main KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Gross Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{totalGrossSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400">
            {filteredInvoices.length} bills · Avg ₹{averageBillValue.toFixed(0)}/bill
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Estimated Gross Profit</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            ₹{estimatedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            {profitMarginPercent.toFixed(1)}% Gross Margin on sales
          </div>
        </div>

        {/* Total GST Collected */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>GST Collected (Output Tax)</span>
            <span className="font-mono text-[10px] text-slate-400">GSTR-1</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{totalGstCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400">
            CGST: ₹{totalCgst.toFixed(0)} · SGST: ₹{totalSgst.toFixed(0)}
          </div>
        </div>

        {/* Near Expiry Risk */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Stock Value at Expiry Risk</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            ₹{nearExpiryRiskValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400">
            {nearExpiryRiskBatches} batches expiring within 60 days
          </div>
        </div>

      </div>

      {/* Payment Collections Breakdown & Dues Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Payment Channels (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Payment Collections by Tender Mode
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total: ₹{totalGrossSales.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Cash Counter</span>
              </div>
              <div className="font-mono font-bold text-sm text-slate-900">
                ₹{cashCollection.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <QrCode className="w-4 h-4 text-sky-600" />
                <span>UPI / QR</span>
              </div>
              <div className="font-mono font-bold text-sm text-slate-900">
                ₹{upiCollection.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Card / POS</span>
              </div>
              <div className="font-mono font-bold text-sm text-slate-900">
                ₹{cardCollection.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Credit / Udhaar</span>
              </div>
              <div className="font-mono font-bold text-sm text-amber-900">
                ₹{dueCreated.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* GST Summary Table */}
          <div className="pt-2 border-t space-y-2">
            <div className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              GST GSTR-1 Sales Breakdown
            </div>
            <div className="grid grid-cols-4 p-2 bg-slate-50 rounded-lg text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Taxable Value</span>
                <span className="font-bold text-slate-800">₹{totalTaxable.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">CGST (Central)</span>
                <span className="font-bold text-slate-800">₹{totalCgst.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">SGST (State)</span>
                <span className="font-bold text-slate-800">₹{totalSgst.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Total Tax Collected</span>
                <span className="font-bold text-amber-700">₹{totalGstCollected.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Dues Balance (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Market Dues: Customers vs Suppliers
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-rose-950">Customer Receivables (Market Udhaar)</span>
                <span className="font-mono font-bold text-rose-700 text-sm">
                  ₹{totalCustomerDues.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-rose-800">
                Total money owed to Golden Medical Store by registered patients.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Distributor Payables (Supplier Dues)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹{totalSupplierDues.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Total money Golden Medical Store owes to medicine distributors.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 text-white space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Net Receivable Position:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    totalCustomerDues - totalSupplierDues >= 0
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  ₹{(totalCustomerDues - totalSupplierDues).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Top 10 Selling Medicines & Dead Stock Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Top 10 Fast Moving (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b font-semibold text-xs text-slate-700 flex justify-between items-center">
            <span>Fast Moving Medicines (Top Sellers)</span>
            <span className="text-slate-400 font-normal">By unit volume</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
            {topSellingMedicines.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No medicine sales in this timeframe.
              </div>
            ) : (
              topSellingMedicines.map((m, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-[10px] text-slate-400">{m.brand}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-slate-900">{m.quantity} units</div>
                    <div className="text-[10px] text-emerald-700 font-mono">
                      ₹{m.revenue.toFixed(0)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dead Stock / Slow Moving (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b font-semibold text-xs text-slate-700 flex justify-between items-center">
            <span>Slow Moving / Dead Stock Alert</span>
            <span className="text-amber-700 font-normal">0 sales in this period</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
            {deadStockProducts.map((p) => {
              const stock = p.batches.reduce((s, b) => s + b.quantity, 0);
              return (
                <div key={p.id} className="p-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[10px] text-slate-500">
                      Rack: {p.rackLocation} · {p.packSize}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-slate-700 font-medium">
                      Holding {stock} {p.unit}s
                    </div>
                    <div className="text-[10px] text-amber-700">Consider promotional push</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
