import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Field,
  Input,
  Notice,
} from './ui';
import { Database, X } from './icons';
import {
  detectColumnMappings,
  convertSheetToAuditTable,
  type ColumnMapping,
} from '../lib/table-conversion';
import { saveSheetToAuditTable, checkTableExists } from '../lib/api-audit-tables';
import type { Sheet } from './attachment-data';

interface TablePersistDialogProps {
  sheet: Sheet;
  artifactId: string;
  artifactName: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (schemaId: string) => void;
}

export function TablePersistDialog({
  sheet,
  artifactId,
  artifactName,
  open,
  onClose,
  onSaved,
}: TablePersistDialogProps) {
  const [tableName, setTableName] = useState(artifactName);
  const [useHeader, setUseHeader] = useState(sheet.header);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTableName(artifactName);
      setUseHeader(sheet.header);
      try {
        setColumnMappings(detectColumnMappings(sheet, sheet.header));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to detect columns');
        setColumnMappings([]);
      }
    }
  }, [open, sheet, artifactName]);

  const handleSave = useCallback(async () => {
    if (!tableName.trim()) {
      setError('Table name is required');
      return;
    }

    if (sheet.total > 1000) {
      setError('Tables with more than 1000 rows cannot be saved');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const converted = convertSheetToAuditTable(sheet, tableName, useHeader, columnMappings);

      const { exists, schemaId: existingSchemaId } = await checkTableExists(converted.tableName);
      if (exists) {
        setError(
          `A table named "${converted.tableName}" already exists. Please choose a different name.`,
        );
        setSaving(false);
        return;
      }

      const { schemaId } = await saveSheetToAuditTable(converted);

      const stored = localStorage.getItem('nod-artifact-tables');
      const existing = stored ? JSON.parse(stored) : {};
      localStorage.setItem(
        'nod-artifact-tables',
        JSON.stringify({ ...existing, [artifactId]: schemaId }),
      );

      onSaved?.(schemaId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save table');
    } finally {
      setSaving(false);
    }
  }, [tableName, useHeader, columnMappings, sheet, artifactId, onSaved, onClose]);

  const updateColumnMapping = useCallback(
    (index: number, field: keyof ColumnMapping, value: string) => {
      setColumnMappings((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const previewRows = (useHeader && sheet.rows.length > 1 ? sheet.rows.slice(1) : sheet.rows).slice(
    0,
    5,
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="table-persist-dialog">
        <DialogTitle>
          <Database size={20} aria-hidden="true" />
          Save Table to Audit
        </DialogTitle>
        <DialogDescription>
          Configure the table structure before saving to the audit system.
        </DialogDescription>

        <div className="dialog-body">
          {error && <Notice kind="error">{error}</Notice>}

          <Field label="Table name">
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              disabled={saving}
              placeholder="Enter table name"
            />
          </Field>

          <div className="field">
            <label className="field-label">
              <input
                type="checkbox"
                checked={useHeader}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseHeader(checked);
                  setColumnMappings(detectColumnMappings(sheet, checked));
                }}
                disabled={saving}
              />
              Use first row as headers
            </label>
          </div>

          <div className="table-persist-columns">
            <h3 className="field-label">Column mappings</h3>
            <div className="table-persist-columns-grid">
              {columnMappings.map((mapping, index) => (
                <div key={index} className="table-persist-column-row">
                  <div className="table-persist-column-field">
                    <label className="table-persist-column-label">Name</label>
                    <Input
                      value={mapping.label}
                      onChange={(e) => updateColumnMapping(index, 'label', e.target.value)}
                      disabled={saving}
                      placeholder="Column name"
                    />
                  </div>
                  <div className="table-persist-column-field">
                    <label className="table-persist-column-label">Type</label>
                    <select
                      className="input"
                      value={mapping.type}
                      onChange={(e) =>
                        updateColumnMapping(index, 'type', e.target.value as ColumnMapping['type'])
                      }
                      disabled={saving}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                      <option value="select">Select</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-persist-preview">
            <h3 className="field-label">Preview (first 5 rows)</h3>
            <div className="table-persist-preview-scroll">
              <table className="table-persist-preview-table">
                <thead>
                  <tr>
                    {columnMappings.map((mapping, index) => (
                      <th key={index}>{mapping.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columnMappings.map((_, colIndex) => (
                        <td key={colIndex}>{row[colIndex] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {sheet.total > 200 && (
            <Notice kind="info">
              Showing first 200 rows in chat. {sheet.total > 1000 ? 'Only' : 'All'}{' '}
              {Math.min(sheet.total, 1000)} rows will be saved.
            </Notice>
          )}
        </div>

        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Table'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
