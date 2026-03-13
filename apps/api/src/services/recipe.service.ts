import { getDatabase } from '../database/connection';
import type {
  Recipe,
  RecipeIngredient,
  RecipeCreateInput,
  RecipeUpdateInput,
} from '@bmad/shared';

export interface RecipeListFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface RecipeListResult {
  data: Recipe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface RecipeRow {
  id: string;
  tenant_id: string;
  name: string;
  category: string | null;
  source: 'manual' | 'scan_ia';
  confidence: 'high' | 'medium' | 'low' | null;
  ai_note: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  tenant_id: string;
  product_id: string | null;
  ingredient_name: string;
  quantity: string;
  unit: string;
  sort_order: number;
  created_at: Date;
}

function mapIngredientRow(row: RecipeIngredientRow): RecipeIngredient {
  return {
    id: row.id,
    recipe_id: row.recipe_id,
    tenant_id: row.tenant_id,
    product_id: row.product_id,
    ingredient_name: row.ingredient_name,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    sort_order: row.sort_order,
    created_at: row.created_at.toISOString(),
  };
}

function mapRecipeRow(row: RecipeRow, ingredients: RecipeIngredient[]): Recipe {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    category: row.category,
    source: row.source,
    confidence: row.confidence,
    ai_note: row.ai_note,
    is_active: row.is_active,
    ingredients,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listRecipes(
  tenantId: string,
  filters: RecipeListFilters = {}
): Promise<RecipeListResult> {
  const db = getDatabase();
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['r.tenant_id = $1', 'r.is_active = true'];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (filters.search) {
    conditions.push(`r.name ILIKE $${paramIdx}`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  const where = conditions.join(' AND ');

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM recipes r WHERE ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const recipeRows = await db.query<RecipeRow>(
    `SELECT r.* FROM recipes r WHERE ${where} ORDER BY r.name ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  if (recipeRows.rows.length === 0) {
    return {
      data: [],
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  const recipeIds = recipeRows.rows.map((r) => r.id);
  const ingredientRows = await db.query<RecipeIngredientRow>(
    `SELECT ri.* FROM recipe_ingredients ri WHERE ri.recipe_id = ANY($1) ORDER BY ri.recipe_id, ri.sort_order ASC`,
    [recipeIds]
  );

  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
  for (const row of ingredientRows.rows) {
    const list = ingredientsByRecipe.get(row.recipe_id) ?? [];
    list.push(mapIngredientRow(row));
    ingredientsByRecipe.set(row.recipe_id, list);
  }

  const data = recipeRows.rows.map((r) =>
    mapRecipeRow(r, ingredientsByRecipe.get(r.id) ?? [])
  );

  return {
    data,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function getRecipeById(id: string, tenantId: string): Promise<Recipe | null> {
  const db = getDatabase();

  const recipeResult = await db.query<RecipeRow>(
    `SELECT * FROM recipes WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
    [id, tenantId]
  );

  if (recipeResult.rows.length === 0) return null;

  const row = recipeResult.rows[0];
  const ingredientResult = await db.query<RecipeIngredientRow>(
    `SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY sort_order ASC`,
    [id]
  );

  const ingredients = ingredientResult.rows.map(mapIngredientRow);
  return mapRecipeRow(row, ingredients);
}

export async function createRecipe(tenantId: string, input: RecipeCreateInput): Promise<Recipe> {
  const db = getDatabase();

  await db.query('BEGIN');
  try {
    const recipeResult = await db.query<RecipeRow>(
      `INSERT INTO recipes (tenant_id, name, category, source, confidence, ai_note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tenantId,
        input.name.trim(),
        input.category?.trim() ?? null,
        input.source ?? 'manual',
        input.confidence ?? null,
        input.ai_note?.trim() ?? null,
      ]
    );

    const recipe = recipeResult.rows[0];

    const ingredients: RecipeIngredient[] = [];
    for (let i = 0; i < input.ingredients.length; i++) {
      const ing = input.ingredients[i];
      const ingResult = await db.query<RecipeIngredientRow>(
        `INSERT INTO recipe_ingredients (recipe_id, tenant_id, product_id, ingredient_name, quantity, unit, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          recipe.id,
          tenantId,
          ing.product_id ?? null,
          ing.ingredient_name.trim(),
          ing.quantity,
          ing.unit.trim(),
          ing.sort_order ?? i,
        ]
      );
      ingredients.push(mapIngredientRow(ingResult.rows[0]));
    }

    await db.query('COMMIT');
    return mapRecipeRow(recipe, ingredients);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

export async function updateRecipe(
  id: string,
  tenantId: string,
  input: RecipeUpdateInput
): Promise<Recipe | null> {
  const db = getDatabase();

  const existing = await getRecipeById(id, tenantId);
  if (!existing) return null;

  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.name !== undefined) {
    setClauses.push(`name = $${paramIdx}`);
    params.push(input.name.trim());
    paramIdx++;
  }
  if (input.category !== undefined) {
    setClauses.push(`category = $${paramIdx}`);
    params.push(input.category.trim() || null);
    paramIdx++;
  }
  if (input.ai_note !== undefined) {
    setClauses.push(`ai_note = $${paramIdx}`);
    params.push(input.ai_note.trim() || null);
    paramIdx++;
  }

  params.push(id, tenantId);

  await db.query('BEGIN');
  try {
    await db.query(
      `UPDATE recipes SET ${setClauses.join(', ')} WHERE id = $${paramIdx} AND tenant_id = $${paramIdx + 1}`,
      params
    );

    if (input.ingredients !== undefined) {
      await db.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [id]);
      for (let i = 0; i < input.ingredients.length; i++) {
        const ing = input.ingredients[i];
        await db.query(
          `INSERT INTO recipe_ingredients (recipe_id, tenant_id, product_id, ingredient_name, quantity, unit, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            tenantId,
            ing.product_id ?? null,
            ing.ingredient_name.trim(),
            ing.quantity,
            ing.unit.trim(),
            ing.sort_order ?? i,
          ]
        );
      }
    }

    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  return getRecipeById(id, tenantId);
}

export async function deleteRecipe(id: string, tenantId: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.query(
    `UPDATE recipes SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
    [id, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}
