export type MedicineCategory =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Injection'
  | 'Ointment'
  | 'Drops'
  | 'Inhaler'
  | 'Surgical'
  | 'Ayurvedic'
  | 'Cosmetics'
  | 'General';

export type MedicineUnit =
  | 'Strip'
  | 'Bottle'
  | 'Piece'
  | 'Box'
  | 'Vial'
  | 'Ampoule'
  | 'Tube'
  | 'Sachet'
  | 'Jar';

export interface Batch {
  id: string;
  batchNumber: string;
  mfgDate: string; // YYYY-MM
  expiryDate: string; // YYYY-MM-DD
  purchaseRate: number; // Cost price per unit
  mrp: number; // Maximum Retail Price
  sellingPrice: number; // Actual counter selling price
  gstRate: number; // 0, 5, 12, 18, 28
  quantity: number; // Current available units
  supplierId?: string;
  supplierName?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string; // Manufacturer / Brand (e.g., Cipla, Sun Pharma)
  genericName: string; // Active salt / composition (e.g., Paracetamol 650mg)
  category: MedicineCategory;
  barcode: string; // EAN / Barcode
  hsnCode: string; // Indian HSN code (e.g., 30049099)
  unit: MedicineUnit;
  packSize: string; // e.g., "10 Tabs/Strip", "100ml Bottle"
  rackLocation: string; // e.g., "Rack A-2", "Fridge B"
  prescriptionRequired: boolean; // Schedule H / H1 drug flag
  minStockLevel: number; // Reorder alert threshold
  notes?: string;
  batches: Batch[];
}

export interface CartItem {
  productId: string;
  batchId: string;
  name: string;
  brand: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  unitPrice: number;
  gstRate: number;
  quantity: number;
  maxQuantity: number;
  discountPercent: number;
  packSize: string;
  rackLocation: string;
  prescriptionRequired: boolean;
  purchaseRate: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Due' | 'Split';

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  doctorName?: string;
  prescriptionNotes?: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  paymentMode: PaymentMethod;
  amountPaid: number;
  amountDue: number;
  cashTendered?: number;
  cashChange?: number;
  cashierName: string;
  cashierRole: 'Owner' | 'Pharmacist';
  status: 'completed' | 'returned' | 'cancelled';
}

export interface ReturnItem {
  productId: string;
  batchId: string;
  name: string;
  batchNumber: string;
  quantity: number;
  refundRate: number;
  totalRefund: number;
  reason: string;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  date: string;
  time: string;
  customerName: string;
  items: ReturnItem[];
  totalRefundAmount: number;
  refundMode: 'Cash' | 'Credit Note' | 'UPI';
  handledBy: string;
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  medicalNotes?: string; // Chronic diseases, allergies
  totalPurchases: number;
  currentDue: number;
  loyaltyPoints: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  gstin: string;
  paymentTerms: string;
  currentDue: number;
  notes?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  sellingPrice: number;
  gstRate: number;
  totalAmount: number;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  supplierInvoiceNumber: string;
  supplierId: string;
  supplierName: string;
  billDate: string;
  items: PurchaseItem[];
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  amountPaid: number;
  paymentStatus: 'Paid' | 'Partial' | 'Due';
  notes?: string;
}

export type StockAdjustmentReason =
  | 'Damage'
  | 'Theft'
  | 'Expiry Disposal'
  | 'Physical Audit Discrepancy'
  | 'Return to Supplier'
  | 'Manual Correction';

export interface StockAdjustment {
  id: string;
  date: string;
  time: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  type: StockAdjustmentReason;
  quantityChange: number; // Can be negative or positive
  previousQty: number;
  newQty: number;
  reasonNotes: string;
  performedBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
  category: 'sales' | 'inventory' | 'purchases' | 'customer' | 'system';
}

export interface PharmacySettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  dlNumber: string;
  fssaiNumber?: string;
  thermalWidth: '58mm' | '80mm';
  receiptFooter: string;
  lowStockThreshold: number;
  nearExpiryDays: number;
  allowExpiredOverride: boolean;
  currencySymbol: string;
}

export type UserRole = 'Owner' | 'Pharmacist';

export interface ActiveUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
}
