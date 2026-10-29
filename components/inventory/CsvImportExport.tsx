'use client';

import React, { useRef } from 'react';
import { Product } from '@/types/pharmacy';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { getTodayDateString } from '@/lib/inventory-utils';

interface CsvImportExportProps {
  products: Product[];
  onImportProducts: (newProducts: Product[]) => void;
}

export const CsvImportExport: React.FC<CsvImportExportProps> = ({
  products,
  onImportProducts,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export Inventory to CSV
  const handleExportCsv = () => {
    const headers = [
      'Name',
      'Brand',
      'GenericName',
      'Category',
      'Barcode',
      'HSNCode',
      'Unit',
      'PackSize',
      'RackLocation',
      'PrescriptionRequired',
      'MinStockLevel',
      'BatchNumber',
      'MfgDate',
      'ExpiryDate',
      'PurchaseRate',
      'MRP',
      'SellingPrice',
      'GSTRate',
      'Quantity',
    ];

    const rows: string[] = [];
    rows.push(headers.join(','));

    products.forEach((p) => {
      p.batches.forEach((b) => {
        const row = [
          `"${p.name.replace(/"/g, '""')}"`,
          `"${p.brand.replace(/"/g, '""')}"`,
          `"${p.genericName.replace(/"/g, '""')}"`,
          p.category,
          p.barcode,
          p.hsnCode,
          p.unit,
          `"${p.packSize}"`,
          `"${p.rackLocation}"`,
          p.prescriptionRequired ? 'TRUE' : 'FALSE',
          p.minStockLevel,
          b.batchNumber,
          b.mfgDate,
          b.expiryDate,
          b.purchaseRate,
          b.mrp,
          b.sellingPrice,
          b.gstRate,
          b.quantity,
        ];
        rows.push(row.join(','));
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute(
      'download',
      `GoldenMedicalStore_Inventory_${getTodayDateString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          alert('CSV file is empty or missing data rows');
          return;
        }

        const newProductsMap: Record<string, Product> = {};

        // Parse rows (ignoring header)
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
          if (parts.length < 18) continue;

          const [
            name,
            brand,
            genericName,
            category,
            barcode,
            hsnCode,
            unit,
            packSize,
            rackLocation,
            rxStr,
            minStockStr,
            batchNumber,
            mfgDate,
            expiryDate,
            purchaseRateStr,
            mrpStr,
            sellingPriceStr,
            gstRateStr,
            qtyStr,
          ] = parts;

          const prodKey = barcode || `${name}_${brand}`;

          if (!newProductsMap[prodKey]) {
            newProductsMap[prodKey] = {
              id: `prod-${Date.now()}-${i}`,
              name,
              brand: brand || 'General Pharma',
              genericName,
              category: (category as any) || 'Tablet',
              barcode: barcode || `890${Math.floor(100000000 + Math.random() * 900000000)}`,
              hsnCode: hsnCode || '30049099',
              unit: (unit as any) || 'Strip',
              packSize: packSize || '10 Tabs',
              rackLocation: rackLocation || 'Rack A-1',
              prescriptionRequired: rxStr?.toUpperCase() === 'TRUE',
              minStockLevel: parseInt(minStockStr) || 15,
              batches: [],
            };
          }

          newProductsMap[prodKey].batches.push({
            id: `b-${Date.now()}-${i}`,
            batchNumber: batchNumber || 'BAT01',
            mfgDate: mfgDate || '2026-01',
            expiryDate: expiryDate || '2028-12-31',
            purchaseRate: parseFloat(purchaseRateStr) || 50,
            mrp: parseFloat(mrpStr) || 80,
            sellingPrice: parseFloat(sellingPriceStr) || 75,
            gstRate: parseInt(gstRateStr) || 12,
            quantity: parseInt(qtyStr) || 10,
          });
        }

        const importedList = Object.values(newProductsMap);
        if (importedList.length === 0) {
          alert('Could not parse any valid product rows from this CSV.');
          return;
        }

        onImportProducts(importedList);
        alert(`Successfully imported ${importedList.length} medicines into inventory!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error('CSV Import Error', err);
        alert('Failed to parse CSV file. Please verify columns match the exported format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportCsv}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
        title="Download full inventory as CSV spreadsheet"
      >
        <Download className="w-3.5 h-3.5 text-slate-600" />
        <span>Export CSV</span>
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
        title="Import medicines from CSV"
      >
        <Upload className="w-3.5 h-3.5 text-slate-600" />
        <span>Import CSV</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
