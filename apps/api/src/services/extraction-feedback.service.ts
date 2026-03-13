import { getDatabase } from '../database/connection';
import type { ExtractionFeedback, ExtractionFeedbackCreateInput } from '@bmad/shared';

interface ExtractionFeedbackRow {
  id: string;
  tenant_id: string;
  plat_nom: string;
  extraction_ia: unknown;
  correction_humaine: unknown;
  created_at: Date;
}

function mapFeedbackRow(row: ExtractionFeedbackRow): ExtractionFeedback {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    plat_nom: row.plat_nom,
    extraction_ia: row.extraction_ia as ExtractionFeedback['extraction_ia'],
    correction_humaine: row.correction_humaine as ExtractionFeedback['correction_humaine'],
    created_at: row.created_at.toISOString(),
  };
}

export async function createExtractionFeedback(
  tenantId: string,
  input: ExtractionFeedbackCreateInput
): Promise<ExtractionFeedback> {
  const db = getDatabase();

  const result = await db.query<ExtractionFeedbackRow>(
    `INSERT INTO extraction_feedback (tenant_id, plat_nom, extraction_ia, correction_humaine)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, input.plat_nom.trim(), JSON.stringify(input.extraction_ia), JSON.stringify(input.correction_humaine)]
  );

  return mapFeedbackRow(result.rows[0]);
}

export async function getRecentFeedbacks(
  tenantId: string,
  limit = 3
): Promise<ExtractionFeedback[]> {
  const db = getDatabase();

  const result = await db.query<ExtractionFeedbackRow>(
    `SELECT * FROM extraction_feedback
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit]
  );

  return result.rows.map(mapFeedbackRow);
}
