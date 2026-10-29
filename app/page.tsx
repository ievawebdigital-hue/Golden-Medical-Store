'use client';

import React, { useState, useEffect } from 'react';
import {
  ActiveUser,
  AuditLog,
  CartItem,
  Customer,
  PharmacySettings,
  Product,
  PurchaseBill,
  ReturnItem,
  ReturnRecord,
  SaleInvoice,
  StockAdjustment,
  StockAdjustmentReason,
  Supplier,
} from '@/types/pharmacy';
import {
  AppState,
  exportBackupJson,
  getInitialState,
  importBackupJson,
  loadAppState,
  resetToSampleData,
  saveAppState,
} from '@/lib/storage';
import { Navbar, NavTab } from '@/components/Navbar';
import { PosScreen } from '@/components/pos/PosScreen';
import { InventoryScreen } from '@/components/inventory/InventoryScreen';
import { PurchaseScreen } from '@/components/purchases/PurchaseScreen';
import { CustomerScreen } from '@/components/customers/CustomerScreen';
import { ReportsDashboard } from '@/components/reports/ReportsDashboard';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { ThermalInvoiceModal } from '@/components/pos/ThermalInvoiceModal';
import { AiPharmacyAssistantModal } from '@/components/ai/AiPharmacyAssistantModal';
import { getCurrentTimeString, getTodayDateString, generateUniqueId } from '@/lib/inventory-utils';

export default function GoldenMedicalStoreApp() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [currentTab, setCurrentTab] = useState<NavTab>('pos');

  // AI Assistant Modal
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiCartItems, setAiCartItems] = useState<CartItem[]>([]);

  // Detailed Invoice View Modal
  const [viewInvoice, setViewInvoice] = useState<SaleInvoice | null>(null);

  // Update storage whenever appState changes
  const updateState = (updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveAppState(next);
      return next;
    });
  };

  if (!appState) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 font-bold text-2xl mb-3">
          ✚
        </div>
        <div className="font-bold text-lg text-amber-400 tracking-tight">Golden Medical Store</div>
        <div className="text-xs text-slate-400 mt-1">Starting POS & Inventory engine...</div>
      </div>
    );
  }

  const activeUser =
    appState.users.find((u) => u.id === appState.activeUserId) || appState.users[0];

  // Helper to add audit log
  const logAudit = (
    action: string,
    details: string,
    category: AuditLog['category']
  ): AuditLog => {
    return {
      id: generateUniqueId('log'),
      timestamp: `${getTodayDateString()} ${getCurrentTimeString()}`,
      action,
      details,
      user: activeUser.name,
      category,
    };
  };

  // 1. Sale Completion Handler
  const handleCompleteSale = (invoice: SaleInvoice) => {
    updateState((prev) => {
      // Deduct stock from matching product batches
      const updatedProducts = prev.products.map((p) => {
        const matchingCartItems = invoice.items.filter((it) => it.productId === p.id);
        if (matchingCartItems.length === 0) return p;

        const updatedBatches = p.batches.map((b) => {
          const itemForBatch = matchingCartItems.find((it) => it.batchId === b.id);
          if (!itemForBatch) return b;
          return {
            ...b,
            quantity: Math.max(0, b.quantity - itemForBatch.quantity),
          };
        });

        return { ...p, batches: updatedBatches };
      });

      // Update customer ledger if registered customer
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id !== invoice.customerId) return c;
        return {
          ...c,
          totalPurchases: c.totalPurchases + invoice.grandTotal,
          currentDue: c.currentDue + (invoice.amountDue || 0),
          loyaltyPoints: c.loyaltyPoints + Math.floor(invoice.grandTotal / 100),
        };
      });

      const audit = logAudit(
        'Sale Invoice Generated',
        `Invoice #${invoice.invoiceNumber} for ${invoice.customerName} (₹${invoice.grandTotal}, ${invoice.paymentMode})`,
        'sales'
      );

      return {
        ...prev,
        products: updatedProducts,
        customers: updatedCustomers,
        invoices: [invoice, ...prev.invoices],
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 2. Sales Return / Refund Handler
  const handleCompleteReturn = (
    invoice: SaleInvoice,
    returnedItems: ReturnItem[],
    refundMode: 'Cash' | 'Credit Note' | 'UPI',
    reasonNotes: string
  ) => {
    updateState((prev) => {
      // Restore stock back into batches
      const updatedProducts = prev.products.map((p) => {
        const matchingReturns = returnedItems.filter((r) => r.productId === p.id);
        if (matchingReturns.length === 0) return p;

        const updatedBatches = p.batches.map((b) => {
          const ret = matchingReturns.find((r) => r.batchId === b.id);
          if (!ret) return b;
          return {
            ...b,
            quantity: b.quantity + ret.quantity,
          };
        });

        return { ...p, batches: updatedBatches };
      });

      const totalRefund = returnedItems.reduce((sum, r) => sum + r.totalRefund, 0);

      // Create return record
      const returnRecord: ReturnRecord = {
        id: generateUniqueId('ret'),
        returnNumber: `RET-${generateUniqueId('r').slice(-4)}`,
        originalInvoiceId: invoice.id,
        originalInvoiceNumber: invoice.invoiceNumber,
        date: getTodayDateString(),
        time: getCurrentTimeString(),
        customerName: invoice.customerName,
        items: returnedItems,
        totalRefundAmount: totalRefund,
        refundMode,
        handledBy: activeUser.name,
        notes: reasonNotes,
      };

      const audit = logAudit(
        'Sales Return Processed',
        `Return for #${invoice.invoiceNumber} (${returnedItems.length} items, Refund: ₹${totalRefund.toFixed(2)})`,
        'sales'
      );

      return {
        ...prev,
        products: updatedProducts,
        returns: [returnRecord, ...prev.returns],
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 3. Inward Purchase Bill Handler
  const handleSavePurchaseBill = (bill: PurchaseBill) => {
    updateState((prev) => {
      // Update or add product batches
      const updatedProducts = prev.products.map((p) => {
        const itemsForProd = bill.items.filter((it) => it.productId === p.id);
        if (itemsForProd.length === 0) return p;

        let newBatches = [...p.batches];
        itemsForProd.forEach((pItem) => {
          const existingBatchIdx = newBatches.findIndex(
            (b) => b.batchNumber === pItem.batchNumber
          );
          if (existingBatchIdx > -1) {
            newBatches[existingBatchIdx] = {
              ...newBatches[existingBatchIdx],
              quantity: newBatches[existingBatchIdx].quantity + pItem.quantity,
              purchaseRate: pItem.purchaseRate,
              mrp: pItem.mrp,
              sellingPrice: pItem.sellingPrice,
              gstRate: pItem.gstRate,
              expiryDate: pItem.expiryDate,
            };
          } else {
            newBatches.push({
              id: generateUniqueId('b'),
              batchNumber: pItem.batchNumber,
              mfgDate: pItem.mfgDate,
              expiryDate: pItem.expiryDate,
              purchaseRate: pItem.purchaseRate,
              mrp: pItem.mrp,
              sellingPrice: pItem.sellingPrice,
              gstRate: pItem.gstRate,
              quantity: pItem.quantity,
              supplierId: bill.supplierId,
              supplierName: bill.supplierName,
            });
          }
        });

        return { ...p, batches: newBatches };
      });

      // Update supplier balance if bill has dues
      const updatedSuppliers = prev.suppliers.map((s) => {
        if (s.id !== bill.supplierId) return s;
        const unpaid = bill.grandTotal - bill.amountPaid;
        return {
          ...s,
          currentDue: s.currentDue + Math.max(0, unpaid),
        };
      });

      const audit = logAudit(
        'Inward Purchase Bill Recorded',
        `Bill #${bill.billNumber} from ${bill.supplierName} (Total: ₹${bill.grandTotal})`,
        'purchases'
      );

      return {
        ...prev,
        products: updatedProducts,
        suppliers: updatedSuppliers,
        purchases: [bill, ...prev.purchases],
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 4. Stock Adjustment Handler
  const handleAdjustStock = (
    productId: string,
    batchId: string,
    quantityChange: number,
    reason: StockAdjustmentReason,
    notes: string
  ) => {
    updateState((prev) => {
      let previousQty = 0;
      let newQty = 0;
      let pName = '';
      let bNo = '';

      const updatedProducts = prev.products.map((p) => {
        if (p.id !== productId) return p;
        pName = p.name;
        const updatedBatches = p.batches.map((b) => {
          if (b.id !== batchId) return b;
          previousQty = b.quantity;
          bNo = b.batchNumber;
          newQty = Math.max(0, b.quantity + quantityChange);
          return { ...b, quantity: newQty };
        });
        return { ...p, batches: updatedBatches };
      });

      const adjRecord: StockAdjustment = {
        id: generateUniqueId('adj'),
        date: getTodayDateString(),
        time: getCurrentTimeString(),
        productId,
        productName: pName,
        batchId,
        batchNumber: bNo,
        type: reason,
        quantityChange,
        previousQty,
        newQty,
        reasonNotes: notes,
        performedBy: activeUser.name,
      };

      const audit = logAudit(
        'Stock Adjusted',
        `${pName} (Batch ${bNo}): ${quantityChange > 0 ? `+${quantityChange}` : quantityChange} [Reason: ${reason}]`,
        'inventory'
      );

      return {
        ...prev,
        products: updatedProducts,
        stockAdjustments: [adjRecord, ...prev.stockAdjustments],
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 5. Physical Stock Audit Reconcile Handler
  const handleApplyAudit = (
    reconciledBatches: {
      productId: string;
      productName: string;
      batchId: string;
      batchNumber: string;
      previousQty: number;
      newQty: number;
    }[]
  ) => {
    updateState((prev) => {
      const recMap = new Map(reconciledBatches.map((r) => [r.batchId, r.newQty]));

      const updatedProducts = prev.products.map((p) => {
        const updatedBatches = p.batches.map((b) => {
          if (recMap.has(b.id)) {
            return { ...b, quantity: recMap.get(b.id)! };
          }
          return b;
        });
        return { ...p, batches: updatedBatches };
      });

      const audit = logAudit(
        'Physical Stock Audit Applied',
        `Reconciled ${reconciledBatches.length} medicine batch discrepancies to match physical shelf count`,
        'inventory'
      );

      return {
        ...prev,
        products: updatedProducts,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 6. Save or Update Product
  const handleSaveProduct = (product: Product) => {
    updateState((prev) => {
      const exists = prev.products.some((p) => p.id === product.id);
      let updatedProducts: Product[];
      if (exists) {
        updatedProducts = prev.products.map((p) => (p.id === product.id ? product : p));
      } else {
        updatedProducts = [product, ...prev.products];
      }

      const audit = logAudit(
        exists ? 'Medicine Master Updated' : 'New Medicine Created',
        `${product.name} (${product.brand}, Generic: ${product.genericName})`,
        'inventory'
      );

      return {
        ...prev,
        products: updatedProducts,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 7. Delete Product
  const handleDeleteProduct = (productId: string) => {
    updateState((prev) => {
      const target = prev.products.find((p) => p.id === productId);
      const updatedProducts = prev.products.filter((p) => p.id !== productId);
      const audit = logAudit(
        'Medicine Deleted',
        `Removed ${target?.name || productId} from inventory master`,
        'inventory'
      );
      return {
        ...prev,
        products: updatedProducts,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 8. Add Customer
  const handleAddCustomer = (customer: Customer) => {
    updateState((prev) => {
      const audit = logAudit(
        'Customer Registered',
        `${customer.name} (Phone: ${customer.phone})`,
        'customer'
      );
      return {
        ...prev,
        customers: [customer, ...prev.customers],
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 9. Collect Customer Due
  const handleCollectCustomerDue = (customerId: string, amount: number) => {
    updateState((prev) => {
      let custName = '';
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id !== customerId) return c;
        custName = c.name;
        return {
          ...c,
          currentDue: Math.max(0, c.currentDue - amount),
        };
      });

      const audit = logAudit(
        'Customer Due Collected',
        `Received ₹${amount} from ${custName}. New balance: ₹${
          updatedCustomers.find((c) => c.id === customerId)?.currentDue
        }`,
        'customer'
      );

      return {
        ...prev,
        customers: updatedCustomers,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 10. Add Supplier
  const handleAddSupplier = (supplier: Supplier) => {
    updateState((prev) => {
      const audit = logAudit(
        'Distributor Registered',
        `${supplier.name} (GSTIN: ${supplier.gstin})`,
        'purchases'
      );
      return {
        ...prev,
        suppliers: [supplier, ...prev.suppliers],
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 11. Record Supplier Payment
  const handleRecordSupplierPayment = (supplierId: string, amount: number) => {
    updateState((prev) => {
      let supName = '';
      const updatedSuppliers = prev.suppliers.map((s) => {
        if (s.id !== supplierId) return s;
        supName = s.name;
        return {
          ...s,
          currentDue: Math.max(0, s.currentDue - amount),
        };
      });

      const audit = logAudit(
        'Supplier Due Paid',
        `Paid ₹${amount} to ${supName}. New balance: ₹${
          updatedSuppliers.find((s) => s.id === supplierId)?.currentDue
        }`,
        'purchases'
      );

      return {
        ...prev,
        suppliers: updatedSuppliers,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 12. Settings & Security
  const handleSaveSettings = (newSettings: PharmacySettings) => {
    updateState((prev) => {
      const audit = logAudit('Settings Updated', 'Store profile and printer parameters updated', 'system');
      return {
        ...prev,
        settings: newSettings,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  const handleUpdateUserPin = (userId: string, newPin: string) => {
    updateState((prev) => {
      const updatedUsers = prev.users.map((u) => (u.id === userId ? { ...u, pin: newPin } : u));
      const audit = logAudit('Security PIN Changed', `Updated authorization PIN for user ${userId}`, 'system');
      return {
        ...prev,
        users: updatedUsers,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  // 13. Backup & Reset
  const handleExportBackup = () => {
    const jsonStr = exportBackupJson(appState);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GoldenMedicalStore_Backup_${getTodayDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (jsonString: string) => {
    const newState = importBackupJson(jsonString);
    setAppState(newState);
  };

  const handleResetSampleData = () => {
    const fresh = resetToSampleData();
    setAppState(fresh);
    alert('Reset complete. All seed medicines and demo records restored.');
  };

  const handleImportProducts = (importedProducts: Product[]) => {
    updateState((prev) => {
      const existingBarcodes = new Set(prev.products.map((p) => p.barcode));
      const combined = [...prev.products];
      importedProducts.forEach((imp) => {
        if (!existingBarcodes.has(imp.barcode)) {
          combined.push(imp);
        }
      });
      const audit = logAudit(
        'CSV Products Imported',
        `Imported ${importedProducts.length} medicines into inventory`,
        'inventory'
      );
      return {
        ...prev,
        products: combined,
        auditLogs: [audit, ...prev.auditLogs],
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Primary Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        users={appState.users}
        activeUser={activeUser}
        onSwitchUser={(userId) => {
          updateState((prev) => ({ ...prev, activeUserId: userId }));
        }}
        onOpenAiAssistant={() => {
          setAiCartItems([]);
          setIsAiOpen(true);
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {currentTab === 'pos' && (
          <PosScreen
            products={appState.products}
            customers={appState.customers}
            settings={appState.settings}
            activeUser={activeUser}
            invoices={appState.invoices}
            onCompleteSale={handleCompleteSale}
            onCompleteReturn={handleCompleteReturn}
            onAddCustomer={handleAddCustomer}
            onOpenAiAssistantWithCart={(cart) => {
              setAiCartItems(cart);
              setIsAiOpen(true);
            }}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryScreen
            products={appState.products}
            activeUser={activeUser}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
            onApplyAudit={handleApplyAudit}
            onImportProducts={handleImportProducts}
          />
        )}

        {currentTab === 'purchases' && (
          <PurchaseScreen
            suppliers={appState.suppliers}
            products={appState.products}
            purchases={appState.purchases}
            activeUser={activeUser}
            onSavePurchaseBill={handleSavePurchaseBill}
            onAddSupplier={handleAddSupplier}
            onRecordSupplierPayment={handleRecordSupplierPayment}
          />
        )}

        {currentTab === 'customers' && (
          <CustomerScreen
            customers={appState.customers}
            invoices={appState.invoices}
            onAddCustomer={handleAddCustomer}
            onCollectCustomerDue={handleCollectCustomerDue}
            onViewInvoice={(inv) => setViewInvoice(inv)}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsDashboard
            invoices={appState.invoices}
            products={appState.products}
            purchases={appState.purchases}
            customers={appState.customers}
            suppliers={appState.suppliers}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsScreen
            settings={appState.settings}
            users={appState.users}
            auditLogs={appState.auditLogs}
            onSaveSettings={handleSaveSettings}
            onUpdateUserPin={handleUpdateUserPin}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetSampleData={handleResetSampleData}
          />
        )}
      </main>

      {/* AI Assistant Modal */}
      {isAiOpen && (
        <AiPharmacyAssistantModal
          products={appState.products}
          initialCart={aiCartItems}
          onClose={() => setIsAiOpen(false)}
        />
      )}

      {/* View Previous Invoice Modal */}
      {viewInvoice && (
        <ThermalInvoiceModal
          invoice={viewInvoice}
          settings={appState.settings}
          onClose={() => setViewInvoice(null)}
        />
      )}

    </div>
  );
}
