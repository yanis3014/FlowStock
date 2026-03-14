'use server';
import type { MenuExtractionResult } from '@bmad/shared';

// URL EU locale — NE PAS importer depuis import-stocks/actions.ts
const EU_OPENAI_URL = 'https://eu.api.openai.com/v1/chat/completions';

export type ExtractMenuOnboardingResult =
  | { success: true; data: MenuExtractionResult }
  | { success: false; error: string };

export async function extractMenuWithAI(
  imageDataUrl: string,
  typeCuisine: string
): Promise<ExtractMenuOnboardingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return { success: false, error: 'OPENAI_API_KEY absent du serveur.' };
  }

  if (!imageDataUrl.startsWith('data:image/')) {
    return { success: false, error: "Format d'image non supporté. Utilisez JPG ou PNG." };
  }

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
                type: 'text',
                text: `Analyse ce menu et retourne un JSON avec cette structure exacte :
{ "plats": [{ "nom": "string", "categorie": "Entrées|Plats|Desserts|Boissons",
"ingredients": [{ "nom": "string", "quantite": number, "unite": "kg|g|litre|cl|pièce" }],
"confiance": "high|medium|low" }] }`,
              },
              {
                type: 'image_url',
                image_url: { url: imageDataUrl, detail: 'high' },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      if (res.status === 401) return { success: false, error: 'Clé OPENAI_API_KEY invalide ou expirée.' };
      if (res.status === 429) return { success: false, error: 'Limite de requêtes OpenAI atteinte. Réessayez.' };
      return { success: false, error: `Erreur OpenAI ${res.status} : ${errBody.slice(0, 200)}` };
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const rawContent = data.choices?.[0]?.message?.content ?? '';
    if (!rawContent) return { success: false, error: 'Réponse OpenAI vide.' };

    const jsonMatch = rawContent.trim().match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : rawContent.trim();
    const parsed = JSON.parse(jsonStr) as MenuExtractionResult;

    if (!Array.isArray(parsed.plats)) {
      return { success: false, error: 'Format de réponse IA invalide (champ "plats" manquant).' };
    }

    const validPlats = parsed.plats.filter(
      (p) => typeof p.nom === 'string' && p.nom.trim().length > 0 && Array.isArray(p.ingredients)
    );

    if (validPlats.length === 0) {
      return { success: false, error: "Aucun plat reconnu. Vérifiez que l'image est lisible et contient un menu." };
    }

    return { success: true, data: { plats: validPlats } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur réseau lors de l'appel OpenAI.",
    };
  }
}
