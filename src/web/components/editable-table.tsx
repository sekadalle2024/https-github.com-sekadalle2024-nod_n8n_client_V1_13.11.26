import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Sheet } from './attachment-data';
import { detectColumnMappings, convertSheetToAuditTable } from '../lib/table-conversion';
import type { ColumnMapping } from '../lib/table-conversion';

interface EditableTableProps {
  sheet: Sheet;
  artifactId: string;
  artifactName: string;
  category?: 'accounting' | 'compliance' | 'risk' | 'general';
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TableRow extends Record<string, unknown> {
  _id?: string;
  _isNew?: boolean;
}

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
  const [pendingSave, setPendingSave] = useState(false);

  const columnMappings = useMemo(() => detectColumnMappings(sheet, true), [sheet]);

  useEffect(() => {
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
            setTableId(savedTableId);
            setRows(
              data.map((d: { id: string; row_data: Record<string, unknown> }) => ({
                ...d.row_data,
                _id: d.id,
              })),
            );
            setIsInitialized(true);
            return;
          }
        }

        const converted = convertSheetToAuditTable(sheet, artifactName, true, columnMappings);

        const createResponse = await fetch('/api/audit/schemas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            table_name: converted.tableName,
            display_name: converted.displayName,
            column_definitions: converted.columnDefinitions,
            category,
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create table schema');
        }

        const { schema } = await createResponse.json();

        if (converted.rows.length > 0) {
          const bulkResponse = await fetch(`/api/audit/schemas/${schema.id}/data/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ rows: converted.rows }),
          });

          if (!bulkResponse.ok) {
            throw new Error('Failed to insert table data');
          }

          const { data } = await bulkResponse.json();
          setRows(
            data.map((d: { id: string; row_data: Record<string, unknown> }) => ({
              ...d.row_data,
              _id: d.id,
            })),
          );
        }

        setTableId(schema.id);
        localStorage.setItem(
          'nod-artifact-tables',
          JSON.stringify({
            ...mappings,
            [artifactId]: schema.id,
          }),
        );
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to restore table:', error);
        setSaveStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      }
    }
    restore();
  }, [artifactId, artifactName, sheet, columnMappings, category]);

  const saveData = useCallback(async () => {
    if (!tableId || !pendingSave) return;

    setSaveStatus('saving');
    setPendingSave(false);

    try {
      const existingRows = rows.filter((row) => row._id && !row._isNew);
      const newRows = rows.filter((row) => row._isNew);

      if (existingRows.length > 0) {
        const updates = existingRows.map((row) => {
          const { _id, _isNew, ...rowData } = row;
          return { data_id: _id, row_data: rowData };
        });

        const response = await fetch(`/api/audit/schemas/${tableId}/data/batch`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ updates }),
        });

        if (!response.ok) {
          throw new Error('Failed to update rows');
        }
      }

      for (const row of newRows) {
        const { _id, _isNew, ...rowData } = row;
        const response = await fetch(`/api/audit/schemas/${tableId}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ row_data: rowData }),
        });

        if (response.ok) {
          const { data } = await response.json();
          row._id = data.id;
          delete row._isNew;
        }
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Save failed');
    }
  }, [tableId, rows, pendingSave]);

  useEffect(() => {
    if (!pendingSave) return;
    const timer = setTimeout(() => {
      saveData();
    }, 2000);
    return () => clearTimeout(timer);
  }, [pendingSave, saveData]);

  const handleCellChange = useCallback((rowIndex: number, columnName: string, value: string) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [columnName]: value };
      return updated;
    });
    setPendingSave(true);
  }, []);

  const handleCellBlur = useCallback(() => {
    if (pendingSave) {
      saveData();
    }
  }, [pendingSave, saveData]);

  const handleAddRow = useCallback(() => {
    const newRow: TableRow = {
      _isNew: true,
    };
    columnMappings.forEach((col) => {
      newRow[col.name] = col.default_value ?? '';
    });
    setRows((prev) => [...prev, newRow]);
  }, [columnMappings]);

  const handleDeleteRow = useCallback(
    async (rowIndex: number) => {
      if (!confirm('Delete this row?')) return;
      const row = rows[rowIndex];

      if (row._id && !row._isNew) {
        try {
          await fetch(`/api/audit/data/${row._id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Failed to delete row:', error);
          return;
        }
      }

      setRows((prev) => prev.filter((_, i) => i !== rowIndex));
    },
    [rows],
  );

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

  const handleManualSave = useCallback(() => {
    setPendingSave(false);
    saveData();
  }, [saveData]);

  if (!isInitialized) {
    return <div className="editable-table-loading">Loading table...</div>;
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'accounting':
        return '💰';
      case 'compliance':
        return '✓';
      case 'risk':
        return '⚠️';
      default:
        return '📊';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'accounting':
        return 'Accounting';
      case 'compliance':
        return 'Compliance';
      case 'risk':
        return 'Risk';
      default:
        return 'General';
    }
  };

  return (
    <div className="editable-table">
      <div className="editable-table-toolbar">
        <span className={`category-badge category-${category}`}>
          {getCategoryIcon(category)} {getCategoryLabel(category)}
        </span>
        <button onClick={handleManualSave} disabled={saveStatus === 'saving'}>
          💾 Save
        </button>
        <button onClick={handleAddRow}>➕ Add Row</button>
        <button onClick={handleExportCSV}>📥 Export CSV</button>
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
                <th scope="row">{rowIndex + 1}</th>
                {columnMappings.map((col, colIndex) => (
                  <td key={colIndex}>
                    <input
                      type={
                        col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'
                      }
                      value={String(row[col.name] ?? '')}
                      onChange={(e) => handleCellChange(rowIndex, col.name, e.target.value)}
                      onBlur={handleCellBlur}
                      className="editable-cell"
                    />
                  </td>
                ))}
                <td>
                  <button
                    onClick={() => handleDeleteRow(rowIndex)}
                    className="delete-row-btn"
                    aria-label="Delete row"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
