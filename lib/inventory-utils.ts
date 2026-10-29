import { Batch, CartItem, Product, SaleInvoice } from '@/types/pharmacy';

let idCounter = 0;

export function generateUniqueId(prefix: string = 'id'): string {
  idCounter += 1;
  const now = Date.now();
  return `${prefix}-${now}-${idCounter}`;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function getCurrentTimeString(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getProductTotalStock(product: Product): number {
  if (!product.batches || product.batches.length === 0) return 0;
  return product.batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
}

export function getDaysUntilExpiry(expiryDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export type ExpiryAlertLevel = 'expired' | 'critical' | 'warning' | 'caution' | 'safe';

export function getExpiryAlertLevel(expiryDateStr: string): ExpiryAlertLevel {
  const days = getDaysUntilExpiry(expiryDateStr);
  if (days <= 0) return 'expired';
  if (days <= 30) return 'critical';
  if (days <= 60) return 'warning';
  if (days <= 90) return 'caution';
  return 'safe';
}

/**
 * Returns batches sorted by First-Expiry-First-Out (FEFO).
 * Batches expiring sooner come first, but expired batches can be placed at the bottom or flagged.
 */
export function sortBatchesFEFO(batches: Batch[], excludeExpired: boolean = false): Batch[] {
  const sorted = [...batches].sort((a, b) => {
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  if (excludeExpired) {
    return sorted.filter((b) => getDaysUntilExpiry(b.expiryDate) > 0);
  }
  return sorted;
}

/**
 * Auto-select the best batch for POS sale following FEFO
 */
export function getRecommendedFEFOBatch(product: Product): Batch | null {
  const available = product.batches.filter((b) => b.quantity > 0 && getDaysUntilExpiry(b.expiryDate) > 0);
  if (available.length === 0) {
    // If no valid unexpired stock with qty > 0, return any with stock
    const anyStock = product.batches.filter((b) => b.quantity > 0);
    return anyStock.length > 0 ? anyStock[0] : (product.batches[0] || null);
  }
  return sortBatchesFEFO(available, true)[0];
}

/**
 * Calculate totals for a cart
 */
export function calculateCartTotals(items: CartItem[]) {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let totalGst = 0;

  items.forEach((item) => {
    const lineGross = item.unitPrice * item.quantity;
    const itemDiscount = (lineGross * (item.discountPercent || 0)) / 100;
    const lineNet = lineGross - itemDiscount;

    subtotal += lineGross;
    totalDiscount += itemDiscount;

    // Prices are standard counter retail prices (GST inclusive)
    const rateFactor = 1 + (item.gstRate || 0) / 100;
    const itemTaxable = lineNet / rateFactor;
    const itemGst = lineNet - itemTaxable;

    taxableAmount += itemTaxable;
    totalGst += itemGst;
  });

  const rawGrandTotal = subtotal - totalDiscount;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));
  const cgstAmount = Number((totalGst / 2).toFixed(2));
  const sgstAmount = Number((totalGst / 2).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgstAmount,
    sgstAmount,
    totalGst: Number(totalGst.toFixed(2)),
    roundOff,
    grandTotal: roundedGrandTotal,
  };
}

/**
 * Formats a clean WhatsApp text receipt
 */
export function generateWhatsAppMessage(invoice: SaleInvoice, storeName: string, phone: string): string {
  const lines: string[] = [];
  lines.push(`*🏥 ${storeName}*`);
  lines.push(`GSTIN: 07AAAAA0000A1Z5 | Ph: ${phone}`);
  lines.push(`--------------------------------`);
  lines.push(`*Tax Invoice:* #${invoice.invoiceNumber}`);
  lines.push(`*Date:* ${invoice.date} ${invoice.time}`);
  lines.push(`*Patient/Customer:* ${invoice.customerName}`);
  if (invoice.doctorName) {
    lines.push(`*Doctor:* ${invoice.doctorName}`);
  }
  lines.push(`--------------------------------`);
  lines.push(`*ITEMS PURCHASED:*`);

  invoice.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. *${item.name}* (Batch: ${item.batchNumber})`
    );
    lines.push(
      `   ${item.quantity} × ₹${item.unitPrice.toFixed(2)} = ₹${(item.quantity * item.unitPrice * (1 - item.discountPercent / 100)).toFixed(2)}`
    );
  });

  lines.push(`--------------------------------`);
  lines.push(`*Subtotal:* ₹${invoice.subtotal.toFixed(2)}`);
  if (invoice.totalDiscount > 0) {
    lines.push(`*Discount:* -₹${invoice.totalDiscount.toFixed(2)}`);
  }
  lines.push(`*GST (CGST+SGST):* ₹${invoice.totalGst.toFixed(2)}`);
  lines.push(`*GRAND TOTAL:* *₹${invoice.grandTotal.toFixed(2)}*`);
  lines.push(`*Paid via:* ${invoice.paymentMode} (₹${invoice.amountPaid})`);
  if (invoice.amountDue > 0) {
    lines.push(`*Remaining Due (Udhaar):* ₹${invoice.amountDue}`);
  }
  lines.push(`--------------------------------`);
  lines.push(`_Thank you for visiting Golden Medical Store. Wishing you good health!_`);

  return encodeURIComponent(lines.join('\n'));
}
