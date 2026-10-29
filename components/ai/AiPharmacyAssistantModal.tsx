'use client';

import React, { useState, useEffect } from 'react';
import { CartItem, Product } from '@/types/pharmacy';
import {
  Sparkles,
  X,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  HelpCircle,
  Loader2,
} from 'lucide-react';

interface AiPharmacyAssistantModalProps {
  products: Product[];
  initialCart?: CartItem[];
  onClose: () => void;
}

export const AiPharmacyAssistantModal: React.FC<AiPharmacyAssistantModalProps> = ({
  products,
  initialCart = [],
  onClose,
}) => {
  const [tab, setTab] = useState<'interactions' | 'substitutes' | 'forecast'>('interactions');

  // Interaction State
  const [cartMedicines, setCartMedicines] = useState(
    initialCart.map((it) => ({ name: it.name, genericName: it.genericName }))
  );
  const [interactionResult, setInteractionResult] = useState<any>(null);
  const [loadingInteraction, setLoadingInteraction] = useState(false);

  // Substitute State
  const [substituteSearch, setSubstituteSearch] = useState('Augmentin 625 Duo');
  const [selectedGeneric, setSelectedGeneric] = useState('Amoxicillin (500mg) + Clavulanic Acid (125mg)');
  const [substituteResult, setSubstituteResult] = useState<any>(null);
  const [loadingSubstitute, setLoadingSubstitute] = useState(false);

  // Demand Forecast State
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const handleCheckInteractions = React.useCallback(async () => {
    if (cartMedicines.length < 2) {
      alert('Please add at least 2 medicines to evaluate drug-drug interactions.');
      return;
    }
    setLoadingInteraction(true);
    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_interactions',
          payload: { items: cartMedicines },
        }),
      });
      const data = await res.json();
      setInteractionResult(data);
    } catch (e) {
      console.error(e);
      alert('Failed to evaluate drug interactions. Please try again.');
    } finally {
      setLoadingInteraction(false);
    }
  }, [cartMedicines]);

  const handleFindSubstitutes = async () => {
    if (!substituteSearch.trim()) return;
    setLoadingSubstitute(true);
    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'find_substitutes',
          payload: {
            medicineName: substituteSearch,
            genericName: selectedGeneric,
          },
        }),
      });
      const data = await res.json();
      setSubstituteResult(data);
    } catch (e) {
      console.error(e);
      alert('Failed to find generic substitutes.');
    } finally {
      setLoadingSubstitute(false);
    }
  };

  const handleForecastRestock = async () => {
    setLoadingForecast(true);
    const lowStock = products
      .filter((p) => p.batches.reduce((s, b) => s + b.quantity, 0) <= p.minStockLevel)
      .map((p) => ({
        name: p.name,
        generic: p.genericName,
        currentStock: p.batches.reduce((s, b) => s + b.quantity, 0),
        minLevel: p.minStockLevel,
      }));

    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forecast_restock',
          payload: { lowStockItems: lowStock },
        }),
      });
      const data = await res.json();
      setForecastResult(data);
    } catch (e) {
      console.error(e);
      alert('Failed to load restocking forecast.');
    } finally {
      setLoadingForecast(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-400">AI Clinical Pharmacy Assistant</h3>
              <p className="text-xs text-slate-400">
                Drug-drug interactions, generic substitutes & smart restocking advice
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 border-b text-xs">
          <button
            onClick={() => setTab('interactions')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              tab === 'interactions'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-white border text-slate-700 hover:bg-slate-100'
            }`}
          >
            Drug-Drug Interactions ({cartMedicines.length} in cart)
          </button>
          <button
            onClick={() => setTab('substitutes')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              tab === 'substitutes'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-white border text-slate-700 hover:bg-slate-100'
            }`}
          >
            Generic & Brand Alternatives
          </button>
          <button
            onClick={() => {
              setTab('forecast');
              if (!forecastResult) handleForecastRestock();
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              tab === 'forecast'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-white border text-slate-700 hover:bg-slate-100'
            }`}
          >
            Restocking Demand Forecast
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
          
          {/* Tab 1: Drug Interactions */}
          {tab === 'interactions' && (
            <div className="space-y-4">
              <div>
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block mb-1">
                  Medicines Currently Evaluated:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {cartMedicines.map((m, i) => (
                    <span
                      key={i}
                      className="bg-slate-100 border border-slate-300 rounded-md px-2.5 py-1 text-slate-800 font-medium"
                    >
                      {m.name} <span className="text-[10px] text-slate-500">({m.genericName})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Add custom medicine to evaluate */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <select
                  onChange={(e) => {
                    const found = products.find((p) => p.id === e.target.value);
                    if (found && !cartMedicines.some((m) => m.name === found.name)) {
                      setCartMedicines([...cartMedicines, { name: found.name, genericName: found.genericName }]);
                    }
                  }}
                  className="p-1.5 bg-slate-50 border rounded text-xs text-slate-700"
                >
                  <option value="">+ Add another medicine from store to test...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.genericName})</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleCheckInteractions}
                  disabled={loadingInteraction || cartMedicines.length < 2}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 font-bold text-slate-950 rounded shadow-sm"
                >
                  {loadingInteraction ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Pharmacodynamics...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze Interactions</span>
                    </>
                  )}
                </button>
              </div>

              {/* Result Container */}
              {interactionResult && (
                <div className="p-4 rounded-xl border space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {interactionResult.hasWarning ? (
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                      <span className="font-bold text-sm text-slate-900">
                        {interactionResult.hasWarning ? 'Interaction Warning Detected' : 'No Critical Interactions Found'}
                      </span>
                    </div>

                    {interactionResult.severity && (
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          interactionResult.severity === 'severe'
                            ? 'bg-rose-100 text-rose-800'
                            : interactionResult.severity === 'moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Severity: {interactionResult.severity}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {interactionResult.summary}
                  </p>

                  {interactionResult.warnings && interactionResult.warnings.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      {interactionResult.warnings.map((w: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-900 text-xs">
                            {w.drugs ? w.drugs.join(' ↔ ') : 'Medication Interaction'}
                          </div>
                          <p className="text-slate-600 text-[11px]">{w.interaction}</p>
                          <div className="text-[11px] text-amber-800 font-semibold pt-0.5">
                            Advisory: {w.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Generic Alternatives */}
          {tab === 'substitutes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Medicine or Type Brand Name
                  </label>
                  <select
                    onChange={(e) => {
                      const found = products.find((p) => p.name === e.target.value);
                      if (found) {
                        setSubstituteSearch(found.name);
                        setSelectedGeneric(found.genericName);
                      }
                    }}
                    className="w-full p-2 bg-slate-50 border rounded-lg text-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>{p.name} ({p.genericName})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleFindSubstitutes}
                    disabled={loadingSubstitute}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 font-bold text-slate-950 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {loadingSubstitute ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Searching Database...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Find Equivalent Substitutes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {substituteResult && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Generic Salt: {substituteResult.saltComposition}
                      </h4>
                      <p className="text-[11px] text-slate-500">Therapeutic use: {substituteResult.clinicalUse}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {substituteResult.substitutes?.map((sub: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{sub.brandName}</div>
                          <div className="text-[10px] text-slate-500">{sub.company} · {sub.notes}</div>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {sub.approxPrice}
                        </div>
                      </div>
                    ))}
                  </div>

                  {substituteResult.pharmacistAdvice && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                      <strong>Pharmacist Counsel:</strong> {substituteResult.pharmacistAdvice}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Restocking Forecast */}
          {tab === 'forecast' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-xs">
                  AI Seasonal Restocking & Demand Recommendation
                </span>
                <button
                  onClick={handleForecastRestock}
                  disabled={loadingForecast}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 font-bold text-slate-950 rounded text-xs"
                >
                  {loadingForecast ? 'Forecasting...' : 'Re-calculate Forecast'}
                </button>
              </div>

              {forecastResult ? (
                <div className="space-y-3">
                  <p className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">
                    {forecastResult.summary}
                  </p>

                  <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                    {forecastResult.recommendations?.map((rec: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{rec.productName}</div>
                          <div className="text-[11px] text-slate-500">{rec.reason}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-sm text-amber-700">
                            + {rec.suggestedReorderQuantity} units
                          </span>
                          <span
                            className={`block text-[10px] font-bold ${
                              rec.urgency === 'High' ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            Urgency: {rec.urgency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                  <p>Analyzing stock levels and demand trends...</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
