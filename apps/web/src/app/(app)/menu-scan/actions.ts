'use server';

import type { MenuExtractionResult, ExtractedDish } from '@bmad/shared';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const VISION_SYSTEM_PROMPT = `Tu es un expert en restauration et gestion de stocks.
Analyse ce menu de restaurant et pour chaque plat identifié,
propose une fiche technique avec les ingrédients probables et leurs quantités typiques.
Réponds UNIQUEMENT en JSON valide :
{
  "plats": [
    {
      "nom": "Poulet rôti",
      "categorie": "Plats chauds",
      "ingredients": [
        { "nom": "Blanc de poulet", "quantite": 0.25, "unite": "kg" },
        { "nom": "Beurre", "quantite": 0.02, "unite": "kg" }
      ],
      "confiance": "high",
      "note": "estimation basée sur portion standard restaurant"
    }
  ]
}`;

function buildFewShotExamples(feedbacks: ExtractedDish[]): string {
  if (feedbacks.length === 0) return '';

  const examples = feedbacks
    .map(
      (f) =>
        `- Plat : ${f.nom}\n  Ingrédients : ${f.ingredients.map((i) => `${i.nom} ${i.quantite}${i.unite}`).join(', ')}`
    )
    .join('\n');

  return `\n\nExemples de fiches techniques validées par ce restaurant (utilise-les comme référence de format et de portions) :\n${examples}`;
}

export type ExtractMenuResult =
  | { success: true; data: MenuExtractionResult }
  | { success: false; error: string };

/**
 * Server Action : envoie l'image à GPT-4o Vision et retourne les plats extraits.
 * @param imageDataUrl - data URL base64 de l'image (image/jpeg, image/png, image/webp)
 * @param recentFeedbacks - dernières corrections humaines pour le few-shot (optionnel)
 */
export async function extractMenuFromImage(
  imageDataUrl: string,
  recentFeedbacks: ExtractedDish[] = []
): Promise<ExtractMenuResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return {
      success: false,
      error: 'OPENAI_API_KEY est absent. Ajoutez-la dans les secrets de votre environnement.',
    };
  }

  if (!imageDataUrl.startsWith('data:image/')) {
    return { success: false, error: 'Format d\'image non supporté. Utilisez JPG, PNG ou WebP.' };
  }

  const systemPrompt = VISION_SYSTEM_PROMPT + buildFewShotExamples(recentFeedbacks);

  let rawContent: string;
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        max_tokens: 4096,
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyse ce menu de restaurant et extrais les fiches techniques de tous les plats identifiés.',
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
      if (res.status === 401) {
        return { success: false, error: 'Clé OPENAI_API_KEY invalide ou expirée.' };
      }
      if (res.status === 429) {
        return { success: false, error: 'Limite de requêtes OpenAI atteinte. Réessayez dans quelques instants.' };
      }
      return {
        success: false,
        error: `Erreur OpenAI ${res.status} : ${errBody.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    rawContent = data.choices?.[0]?.message?.content ?? '';
    if (!rawContent) {
      return { success: false, error: 'Réponse OpenAI vide. Réessayez.' };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur réseau lors de l\'appel OpenAI.',
    };
  }

  try {
    const cleaned = rawContent.trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
    const parsed = JSON.parse(jsonStr) as MenuExtractionResult;

    if (!Array.isArray(parsed.plats)) {
      return { success: false, error: 'Format de réponse IA invalide (champ "plats" manquant).' };
    }

    const validPlats = parsed.plats.filter(
      (p) =>
        typeof p.nom === 'string' &&
        p.nom.trim().length > 0 &&
        Array.isArray(p.ingredients)
    );

    if (validPlats.length === 0) {
      return {
        success: false,
        error: 'Aucun plat reconnu dans l\'image. Vérifiez que l\'image est lisible et contient un menu.',
      };
    }

    return { success: true, data: { plats: validPlats } };
  } catch {
    return { success: false, error: 'Réponse IA non valide (JSON malformé). Réessayez.' };
  }
}
