import type { ColumnMapping, ConvertedTable } from './table-conversion';

interface TableSchema {
  id: string;
  owner_id: string;
  table_name: string;
  display_name: string;
  n8n_workflow_id: string | null;
  column_definitions: ColumnMapping[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface DataVersion {
  id: string;
  table_data_id: string;
  row_data: Record<string, unknown>;
  change_type: 'create' | 'update' | 'delete';
  changed_by: string | null;
  changed_at: string;
}

export async function saveSheetToAuditTable(
  converted: ConvertedTable,
): Promise<{ schemaId: string }> {
  const createResponse = await fetch('/api/audit/schemas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      table_name: converted.tableName,
      display_name: converted.displayName,
      column_definitions: converted.columnDefinitions,
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json().catch(() => ({ error: 'Failed to create schema' }));
    throw new Error(error.error || 'Failed to create table schema');
  }

  const { schema } = (await createResponse.json()) as { schema: TableSchema };

  if (converted.rows.length > 0) {
    try {
      const bulkResponse = await fetch(`/api/audit/schemas/${schema.id}/data/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rows: converted.rows }),
      });

      if (!bulkResponse.ok) {
        throw new Error('Failed to insert table data');
      }
    } catch (err) {
      try {
        await fetch(`/api/audit/schemas/${schema.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch {}
      throw err;
    }
  }

  return { schemaId: schema.id };
}

export async function checkTableExists(
  tableName: string,
): Promise<{ exists: boolean; schemaId?: string }> {
  const response = await fetch('/api/audit/schemas', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return { exists: false };
  }

  const { schemas } = (await response.json()) as { schemas: TableSchema[] };
  const existing = schemas.find((s) => s.table_name === tableName && !s.deleted_at);

  return {
    exists: !!existing,
    schemaId: existing?.id,
  };
}

export async function getTableVersions(dataId: string): Promise<DataVersion[]> {
  const response = await fetch(`/api/audit/data/${dataId}/versions`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch versions');
  }

  const { versions } = (await response.json()) as { versions: DataVersion[] };
  return versions;
}
