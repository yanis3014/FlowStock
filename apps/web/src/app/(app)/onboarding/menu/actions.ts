'use server';
import type { MenuExtractionResult } from '@bmad/shared';

// URL OpenAI standard (valide pour tous les comptes)
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export type ExtractMenuOnboardingResult =
  | { success: true; data: MenuExtractionResult }
  | { success: false; error: string };

export async function extractMenuWithAI(
  imageDataUrl: string,
  typeCuisine: string
): Promise<ExtractMenuOnboardingResult> {
  console.log('[SCAN DEBUG] OPENAI_API_KEY présente:', !!process.env.OPENAI_API_KEY);
  console.log('[SCAN DEBUG] 4 premiers chars:', process.env.OPENAI_API_KEY?.slice(0, 8));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return { success: false, error: 'OPENAI_API_KEY absent du serveur.' };
  }

  if (!imageDataUrl.startsWith('data:image/')) {
    return { success: false, error: "Format d'image non supporté. Utilisez JPG ou PNG." };
  }

  const dataUrlParts = imageDataUrl.split(',');
  if (dataUrlParts.length < 2) {
    return { success: false, error: "Format d'image non supporté. Utilisez JPG ou PNG." };
  }

  const base64Data = dataUrlParts[1];
  const mimeType = imageDataUrl.split(';')[0]?.split(':')[1];
  if (!mimeType) {
    return { success: false, error: "Format d'image non supporté. Utilisez JPG ou PNG." };
  }
  let fileId: string | null = null;

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, 'menu.jpg');
    formData.append('purpose', 'vision');

    const uploadRes = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return { success: false, error: `Upload image échoué: ${err.slice(0, 200)}` };
    }

    const uploadData = await uploadRes.json() as { id?: string };
    if (!uploadData?.id) {
      return { success: false, error: 'Upload image échoué: file_id introuvable.' };
    }
    fileId = uploadData.id;
  } catch {
    return { success: false, error: 'Upload image échoué - vérifiez les permissions du projet OpenAI.' };
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
    const buildPayload = (model: 'gpt-4o' | 'gpt-4o-mini') => ({
      model,
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
              type: 'image_file',
              image_file: { file_id: fileId },
            },
          ],
        },
      ],
    });

    let modelUsed: 'gpt-4o' | 'gpt-4o-mini' = 'gpt-4o';
    let res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildPayload(modelUsed)),
    });
    console.log('[SCAN DEBUG] OpenAI response status:', res.status);
    let errBody = '';
    if (!res.ok) {
      errBody = await res.text();
      console.log('[SCAN DEBUG] OpenAI error body:', errBody);
    }
    console.error(`[menu-scan] OpenAI model=${modelUsed} status=${res.status}`);

    const shouldFallback =
      res.status === 404 ||
      (res.status === 400 && /model_not_found/i.test(errBody));

    if (!res.ok && shouldFallback) {
      modelUsed = 'gpt-4o-mini';
      res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(buildPayload(modelUsed)),
      });
      console.log('[SCAN DEBUG] OpenAI response status:', res.status);
      errBody = '';
      if (!res.ok) {
        errBody = await res.text();
        console.log('[SCAN DEBUG] OpenAI error body:', errBody);
      }
      console.error(`[menu-scan] OpenAI model=${modelUsed} status=${res.status}`);
    }

    if (!res.ok) {
      if (res.status === 401) return { success: false, error: 'Clé OPENAI_API_KEY invalide ou expirée.' };
      if (res.status === 429) return { success: false, error: 'Limite de requêtes OpenAI atteinte. Réessayez.' };
      if (res.status === 400) {
        let errorMessage = errBody.slice(0, 200);
        try {
          const errorBody = JSON.parse(errBody) as { error?: { message?: string } };
          errorMessage = errorBody.error?.message ?? errorMessage;
        } catch {
          // keep raw fallback
        }
        return { success: false, error: `Erreur OpenAI 400 : ${errorMessage}` };
      }
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
  } finally {
    if (fileId) {
      await fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => undefined);
    }
  }
}
