import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Sheet } from './attachment-data';
import { detectColumnMappings, convertSheetToAuditTable } from '../lib/table-conversion';
import { saveSheetToAuditTable, checkTableExists } from '../lib/api-audit-tables';
import { Download } from './icons';

interface EditableTableProps {
  sheet: Sheet;
  artifactId: string;
  artifactName: string;
  category?: 'accounting' | 'compliance' | 'risk' | 'general';
}

interface TableRow extends Record<string, unknown> {
  _id?: string;
  _isNew?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function EditableTable({
  sheet,
  artifactId,
  artifactName,
  category = 'general',
}: EditableTableProps) {
  const [tableId, setTableId] = useState<string | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<number, TableRow>>(new Map());
  const [saveTimeout, setSaveTimeout] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const columnMappings = useMemo(() => detectColumnMappings(sheet, true), [sheet]);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const stored = localStorage.getItem('nod-artifact-tables');
        const mappings = stored ? JSON.parse(stored) : {};
        const savedTableId = mappings[artifactId];

        if (savedTableId) {
          const response = await fetch(`/api/audit/schemas/${savedTableId}/data`, {
            credentials: 'include',
          });
          if (response.ok) {
            const { data } = await response.json();
            if (!active) return;
            setTableId(savedTableId);
            setRows(
              data.map((d: { id: string; row_data: Record<string, unknown> }) => ({
                _id: d.id,
                ...d.row_data,
              })),
            );
            setIsInitialized(true);
            return;
          }
        }

        const { exists, schemaId } = await checkTableExists(artifactName);
        if (exists && schemaId) {
          const response = await fetch(`/api/audit/schemas/${schemaId}/data`, {
            credentials: 'include',
          });
          if (response.ok) {
            const { data } = await response.json();
            if (!active) return;
            setTableId(schemaId);
            setRows(
              data.map((d: { id: string; row_data: Record<string, unknown> }) => ({
                _id: d.id,
                ...d.row_data,
              })),
            );
            localStorage.setItem(
              'nod-artifact-tables',
              JSON.stringify({
                ...mappings,
                [artifactId]: schemaId,
              }),
            );
            setIsInitialized(true);
            return;
          }
        }

        const converted = convertSheetToAuditTable(sheet, artifactName, true, columnMappings);
        const { schemaId: newSchemaId } = await saveSheetToAuditTable({
          ...converted,
          category,
        });

        if (!active) return;

        const response = await fetch(`/api/audit/schemas/${newSchemaId}/data`, {
          credentials: 'include',
        });

        if (response.ok) {
          const { data } = await response.json();
          setTableId(newSchemaId);
          setRows(
            data.map((d: { id: string; row_data: Record<string, unknown> }) => ({
              _id: d.id,
              ...d.row_data,
            })),
          );
          localStorage.setItem(
            'nod-artifact-tables',
            JSON.stringify({
              ...mappings,
              [artifactId]: newSchemaId,
            }),
          );
        } else {
          setRows(converted.rows);
          setTableId(newSchemaId);
        }

        setIsInitialized(true);
      } catch (error) {
        if (!active) return;
        setSaveStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    void restore();

    return () => {
      active = false;
      if (saveTimeout !== null) {
        window.clearTimeout(saveTimeout);
      }
    };
  }, [artifactId, artifactName, sheet, columnMappings, category, saveTimeout]);

  const performSave = useCallback(async () => {
    if (!tableId || pendingChanges.size === 0 || isSaving) return;

    setIsSaving(true);
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      const changes = Array.from(pendingChanges.entries());

      for (const [index, row] of changes) {
        const { _id, _isNew, ...rowData } = row;

        if (_isNew) {
          const response = await fetch(`/api/audit/schemas/${tableId}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ row_data: rowData }),
          });

          if (response.ok) {
            const { data } = await response.json();
            setRows((prev) => {
              const updated = [...prev];
              updated[index] = { _id: data.id, ...rowData };
              return updated;
            });
          }
        } else if (_id) {
          await fetch(`/api/audit/data/${_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ row_data: rowData }),
          });
        }
      }

      setPendingChanges(new Map());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [tableId, pendingChanges, isSaving]);

  const debouncedSave = useCallback(() => {
    if (saveTimeout !== null) {
      window.clearTimeout(saveTimeout);
    }

    const timeout = window.setTimeout(() => {
      void performSave();
    }, 2000);

    setSaveTimeout(timeout);
  }, [saveTimeout, performSave]);

  const handleCellChange = useCallback(
    (rowIndex: number, columnName: string, value: string) => {
      setRows((prev) => {
        const updated = [...prev];
        updated[rowIndex] = { ...updated[rowIndex], [columnName]: value };
        return updated;
      });

      setPendingChanges((prev) => {
        const newChanges = new Map(prev);
        const row = rows[rowIndex];
        newChanges.set(rowIndex, { ...row, [columnName]: value });
        return newChanges;
      });

      debouncedSave();
    },
    [rows, debouncedSave],
  );

  const handleCellBlur = useCallback(() => {
    if (saveTimeout !== null) {
      window.clearTimeout(saveTimeout);
      setSaveTimeout(null);
      void performSave();
    }
  }, [saveTimeout, performSave]);

  const handleAddRow = useCallback(() => {
    const newRow: TableRow = columnMappings.reduce(
      (acc, col) => {
        acc[col.name] = col.default_value ?? null;
        return acc;
      },
      { _isNew: true } as TableRow,
    );

    setRows((prev) => [...prev, newRow]);
    setPendingChanges((prev) => {
      const newChanges = new Map(prev);
      newChanges.set(rows.length, newRow);
      return newChanges;
    });

    debouncedSave();
  }, [columnMappings, rows.length, debouncedSave]);

  const handleDeleteRow = useCallback(
    async (rowIndex: number) => {
      if (!confirm('Delete this row?')) return;

      const row = rows[rowIndex];
      if (row._id) {
        try {
          await fetch(`/api/audit/data/${row._id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to delete row');
          setSaveStatus('error');
          return;
        }
      }

      setRows((prev) => prev.filter((_, i) => i !== rowIndex));
      setPendingChanges((prev) => {
        const newChanges = new Map(prev);
        newChanges.delete(rowIndex);
        return newChanges;
      });
    },
    [rows],
  );

  const handleManualSave = useCallback(() => {
    if (saveTimeout !== null) {
      window.clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    void performSave();
  }, [saveTimeout, performSave]);

  const handleExportCSV = useCallback(() => {
    const headers = columnMappings.map((col) => col.label).join(',');
    const csvRows = rows.map((row) =>
      columnMappings
        .map((col) => {
          const value = row[col.name];
          const stringValue = value === null || value === undefined ? '' : String(value);
          return stringValue.includes(',') ||
            stringValue.includes('"') ||
            stringValue.includes('\n')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        })
        .join(','),
    );
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifactName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, columnMappings, artifactName]);

  if (!isInitialized) {
    return (
      <div className="editable-table-loading" role="status">
        Loading table...
      </div>
    );
  }

  return (
    <div className="editable-table">
      <div className="editable-table-toolbar">
        <button onClick={handleManualSave} disabled={saveStatus === 'saving'}>
          💾 Save
        </button>
        <button onClick={handleAddRow}>➕ Add Row</button>
        <button onClick={handleExportCSV}>
          <Download size={16} aria-hidden="true" />
          Export CSV
        </button>
        {saveStatus !== 'idle' && (
          <span className={`save-status save-status-${saveStatus}`}>
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved ✓'}
            {saveStatus === 'error' && `Error ✗ ${errorMessage || ''}`}
          </span>
        )}
      </div>

      <div className="editable-table-scroll" tabIndex={0} data-artifact-scroll="">
        <table>
          <thead>
            <tr>
              <th aria-label="Row number">#</th>
              {columnMappings.map((col, i) => (
                <th key={i}>{col.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>{rowIndex + 1}</td>
                {columnMappings.map((col, colIndex) => (
                  <td key={colIndex}>
                    <input
                      type={col.type === 'number' ? 'number' : 'text'}
                      value={String(row[col.name] ?? '')}
                      onChange={(e) => handleCellChange(rowIndex, col.name, e.target.value)}
                      onBlur={handleCellBlur}
                      className="editable-cell"
                    />
                  </td>
                ))}
                <td>
                  <button onClick={() => handleDeleteRow(rowIndex)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
