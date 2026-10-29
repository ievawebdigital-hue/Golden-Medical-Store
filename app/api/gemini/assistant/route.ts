import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { action, payload } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    if (action === 'check_interactions') {
      const { items } = payload;
      if (!items || items.length < 2) {
        return NextResponse.json({
          hasWarning: false,
          summary: 'At least two medications are needed to evaluate drug-drug interactions.',
          details: [],
        });
      }

      const medicineList = items
        .map(
          (it: { name: string; genericName: string }) =>
            `- ${it.name} (Composition: ${it.genericName})`
        )
        .join('\n');

      const prompt = `You are a clinical pharmacy safety expert for an Indian medical store.
Evaluate the following medicines in a patient's bill for potential drug-drug interactions, duplicate drug classes (e.g. two NSAIDs), or dangerous contraindications:

${medicineList}

Return a strictly valid JSON response with the following format:
{
  "hasWarning": boolean,
  "severity": "none" | "mild" | "moderate" | "severe",
  "summary": "1-2 sentence quick summary for the pharmacist counter staff",
  "warnings": [
    {
      "drugs": ["Drug 1", "Drug 2"],
      "interaction": "Clear medical description of the interaction",
      "recommendation": "What the pharmacist should advise or check with the prescriber"
    }
  ]
}
Do not wrap in markdown quotes. Just return the JSON object.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '{}';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json(parsed);
    }

    if (action === 'find_substitutes') {
      const { medicineName, genericName } = payload;
      const prompt = `You are an Indian registered pharmacist. A customer is asking for alternatives or generic substitutes for:
Medicine: ${medicineName}
Salt/Composition: ${genericName}

Provide 3 to 4 equivalent popular Indian brand and generic alternatives with exact matching compositions, typical pack price comparison (e.g., high brand vs Jan Aushadhi / economic brand), and guidance.

Return strictly valid JSON:
{
  "saltComposition": "${genericName}",
  "clinicalUse": "Primary therapeutic use",
  "substitutes": [
    {
      "brandName": "Name of alternative brand",
      "company": "Manufacturer (e.g. Cipla, Sun Pharma, Mankind, Abbott)",
      "approxPrice": "Approx ₹ range",
      "notes": "Key distinction or Jan Aushadhi equivalent"
    }
  ],
  "pharmacistAdvice": "1 sentence advice for patient counseling"
}
Do not wrap in markdown quotes. Just return the JSON object.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '{}';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json(parsed);
    }

    if (action === 'forecast_restock') {
      const { lowStockItems } = payload;
      const prompt = `You are a pharmacy inventory manager in India. Review this list of low-stock medicines:
${JSON.stringify(lowStockItems, null, 2)}

Provide intelligent replenishment recommendations taking into account disease seasonality (monsoon, winter respiratory, viral fevers, chronic maintenance):
Return strictly valid JSON:
{
  "summary": "Overview of immediate reordering priority",
  "recommendations": [
    {
      "productName": "string",
      "suggestedReorderQuantity": number,
      "urgency": "High" | "Medium" | "Low",
      "reason": "e.g. high chronic demand / seasonal peak"
    }
  ]
}
Do not wrap in markdown quotes. Just return the JSON object.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '{}';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Gemini Assistant Error:', error);
    const message = error instanceof Error ? error.message : 'Server error in AI processing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
