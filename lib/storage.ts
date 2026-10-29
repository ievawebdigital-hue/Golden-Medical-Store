import {
  ActiveUser,
  AuditLog,
  Customer,
  PharmacySettings,
  Product,
  PurchaseBill,
  ReturnRecord,
  SaleInvoice,
  StockAdjustment,
  Supplier,
} from '@/types/pharmacy';
import {
  DEFAULT_SETTINGS,
  DEFAULT_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_SUPPLIERS,
} from './sample-data';

export interface AppState {
  settings: PharmacySettings;
  users: ActiveUser[];
  activeUserId: string;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: SaleInvoice[];
  purchases: PurchaseBill[];
  returns: ReturnRecord[];
  stockAdjustments: StockAdjustment[];
  auditLogs: AuditLog[];
  lastBackupDate?: string;
}

const STORAGE_KEY = 'golden_medical_store_v1';

export function getInitialState(): AppState {
  return {
    settings: DEFAULT_SETTINGS,
    users: DEFAULT_USERS,
    activeUserId: DEFAULT_USERS[0].id,
    products: INITIAL_PRODUCTS,
    customers: INITIAL_CUSTOMERS,
    suppliers: INITIAL_SUPPLIERS,
    invoices: INITIAL_INVOICES,
    purchases: INITIAL_PURCHASES,
    returns: [],
    stockAdjustments: [],
    auditLogs: INITIAL_AUDIT_LOGS,
    lastBackupDate: new Date().toISOString(),
  };
}

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return getInitialState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as AppState;
    // Fallback integrity checks
    return {
      settings: parsed.settings || DEFAULT_SETTINGS,
      users: parsed.users || DEFAULT_USERS,
      activeUserId: parsed.activeUserId || DEFAULT_USERS[0].id,
      products: parsed.products || INITIAL_PRODUCTS,
      customers: parsed.customers || INITIAL_CUSTOMERS,
      suppliers: parsed.suppliers || INITIAL_SUPPLIERS,
      invoices: parsed.invoices || INITIAL_INVOICES,
      purchases: parsed.purchases || INITIAL_PURCHASES,
      returns: parsed.returns || [],
      stockAdjustments: parsed.stockAdjustments || [],
      auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
      lastBackupDate: parsed.lastBackupDate,
    };
  } catch (e) {
    console.error('Failed to parse stored state, initializing fresh state', e);
    const initial = getInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save app state to localStorage', e);
  }
}

export function resetToSampleData(): AppState {
  const fresh = getInitialState();
  saveAppState(fresh);
  return fresh;
}

export function exportBackupJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importBackupJson(jsonString: string): AppState {
  const parsed = JSON.parse(jsonString) as AppState;
  if (!parsed.products || !Array.isArray(parsed.products)) {
    throw new Error('Invalid backup file: missing products array');
  }
  saveAppState(parsed);
  return parsed;
}
