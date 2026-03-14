'use server';
import type { MenuExtractionResult } from '@bmad/shared';

// URL EU locale — NE PAS importer depuis import-stocks/actions.ts
const EU_OPENAI_URL = 'https://eu.api.openai.com/v1/chat/completions';

export async function extractMenuWithAI(
  imageBase64: string,
  mimeType: string,
  typeCuisine: string
): Promise<MenuExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return { plats: [] };

  const systemPrompt = `Tu es un expert en restauration et gestion de stocks.
Analyse ce menu de restaurant et pour chaque plat identifié, propose une fiche technique
réaliste avec les ingrédients et quantités typiques pour une portion.
Tiens compte du type de cuisine : ${typeCuisine}.
RÈGLES IMPÉRATIVES :
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
- Utilise EXCLUSIVEMENT le français pour tous les noms et valeurs.
- La valeur de "categorie" doit être EXACTEMENT l'une de ces valeurs : Entrées, Plats, Desserts, Boissons.
- La valeur de "unite" doit être EXACTEMENT l'une de : kg, g, litre, cl, pièce.
- La valeur de "confiance" doit être EXACTEMENT : high, medium ou low.`;

  try {
    const res = await fetch(EU_OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: 'text',
                text: `Retourne un JSON avec cette structure exacte :
{ "plats": [{ "nom": "string", "categorie": "Entrées|Plats|Desserts|Boissons",
"ingredients": [{ "nom": "string", "quantite": number, "unite": "kg|g|litre|cl|pièce" }],
"confiance": "high|medium|low" }] }`,
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { plats: [] };
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as MenuExtractionResult;
    return parsed?.plats ? parsed : { plats: [] };
  } catch {
    return { plats: [] };
  }
}
