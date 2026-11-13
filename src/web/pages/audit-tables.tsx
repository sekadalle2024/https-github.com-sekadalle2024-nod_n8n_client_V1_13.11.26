import { useEffect, useState } from 'react';

interface AuditTableSchema {
  id: string;
  owner_id: string;
  table_name: string;
  display_name: string;
  column_definitions: ColumnDefinition[];
  created_at: string;
}

interface ColumnDefinition {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  label?: string;
  required?: boolean;
  options?: string[];
}

interface TableData {
  id: string;
  row_data: Record<string, any>;
  row_order: number;
  created_at: string;
  updated_at: string;
}

export function AuditTablesPage() {
  const [schemas, setSchemas] = useState<AuditTableSchema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<AuditTableSchema | null>(null);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnName: string } | null>(
    null,
  );
  const [editValue, setEditValue] = useState<any>('');

  // Charger la liste des tables
  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/audit/schemas');
      if (!response.ok) throw new Error('Erreur lors du chargement des tables');
      const data = await response.json();
      setSchemas(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données d'une table
  const loadTableData = async (schemaId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/audit/schemas/${schemaId}/data`);
      if (!response.ok) throw new Error('Erreur lors du chargement des données');
      const data = await response.json();
      setTableData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sélectionner une table
  const selectSchema = (schema: AuditTableSchema) => {
    setSelectedSchema(schema);
    loadTableData(schema.id);
  };

  // Commencer l'édition d'une cellule
  const startEdit = (rowId: string, columnName: string, currentValue: any) => {
    setEditingCell({ rowId, columnName });
    setEditValue(currentValue ?? '');
  };

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Sauvegarder la modification
  const saveEdit = async () => {
    if (!editingCell || !selectedSchema) return;

    const row = tableData.find((r) => r.id === editingCell.rowId);
    if (!row) return;

    const newRowData = {
      ...row.row_data,
      [editingCell.columnName]: editValue,
    };

    setLoading(true);
    try {
      const response = await fetch(`/api/audit/data/${editingCell.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row_data: newRowData }),
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

      // Recharger les données
      await loadTableData(selectedSchema.id);
      setEditingCell(null);
      setEditValue('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ajouter une nouvelle ligne
  const addRow = async () => {
    if (!selectedSchema) return;

    const emptyRow: Record<string, any> = {};
    selectedSchema.column_definitions.forEach((col) => {
      if (col.type === 'boolean') emptyRow[col.name] = false;
      else if (col.type === 'number') emptyRow[col.name] = 0;
      else emptyRow[col.name] = '';
    });

    setLoading(true);
    try {
      const response = await fetch(`/api/audit/schemas/${selectedSchema.id}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row_data: emptyRow }),
      });

      if (!response.ok) throw new Error("Erreur lors de l'ajout");

      await loadTableData(selectedSchema.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une ligne
  const deleteRow = async (rowId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette ligne ?')) return;
    if (!selectedSchema) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/audit/data/${rowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      await loadTableData(selectedSchema.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rendu de la cellule éditable
  const renderCell = (row: TableData, column: ColumnDefinition) => {
    const value = row.row_data[column.name];
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnName === column.name;

    if (isEditing) {
      if (column.type === 'select' && column.options) {
        return (
          <div className="flex gap-2">
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="border px-2 py-1 rounded"
              autoFocus
            >
              <option value="">-- Choisir --</option>
              {column.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <button
              onClick={saveEdit}
              className="bg-green-500 text-white px-2 py-1 rounded text-sm"
            >
              ✓
            </button>
            <button onClick={cancelEdit} className="bg-gray-300 px-2 py-1 rounded text-sm">
              ✕
            </button>
          </div>
        );
      } else if (column.type === 'boolean') {
        return (
          <div className="flex gap-2">
            <input
              type="checkbox"
              checked={editValue}
              onChange={(e) => setEditValue(e.target.checked)}
              autoFocus
            />
            <button
              onClick={saveEdit}
              className="bg-green-500 text-white px-2 py-1 rounded text-sm"
            >
              ✓
            </button>
            <button onClick={cancelEdit} className="bg-gray-300 px-2 py-1 rounded text-sm">
              ✕
            </button>
          </div>
        );
      } else {
        return (
          <div className="flex gap-2">
            <input
              type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
              value={editValue}
              onChange={(e) =>
                setEditValue(column.type === 'number' ? parseFloat(e.target.value) : e.target.value)
              }
              className="border px-2 py-1 rounded flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            <button
              onClick={saveEdit}
              className="bg-green-500 text-white px-2 py-1 rounded text-sm"
            >
              ✓
            </button>
            <button onClick={cancelEdit} className="bg-gray-300 px-2 py-1 rounded text-sm">
              ✕
            </button>
          </div>
        );
      }
    }

    // Mode lecture
    return (
      <div
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
        onClick={() => startEdit(row.id, column.name, value)}
      >
        {column.type === 'boolean' ? (value ? '✓' : '✗') : value?.toString() || '-'}
      </div>
    );
  };

  if (loading && !selectedSchema) {
    return <div className="p-4">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button onClick={loadSchemas} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Tables d'Audit</h1>

      <div className="grid grid-cols-4 gap-4">
        {/* Liste des tables */}
        <div className="col-span-1 border rounded p-4">
          <h2 className="font-bold mb-2">Tables disponibles</h2>
          {schemas.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune table</p>
          ) : (
            <div className="space-y-2">
              {schemas.map((schema) => (
                <button
                  key={schema.id}
                  onClick={() => selectSchema(schema)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedSchema?.id === schema.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {schema.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Données de la table */}
        <div className="col-span-3">
          {!selectedSchema ? (
            <div className="border rounded p-8 text-center text-gray-500">
              Sélectionnez une table à gauche
            </div>
          ) : (
            <div className="border rounded">
              {/* En-tête */}
              <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                <h2 className="font-bold">{selectedSchema.display_name}</h2>
                <button
                  onClick={addRow}
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  + Ajouter une ligne
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {selectedSchema.column_definitions.map((col) => (
                        <th
                          key={col.name}
                          className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b"
                        >
                          {col.label || col.name}
                          {col.required && <span className="text-red-500">*</span>}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={selectedSchema.column_definitions.length + 1}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Aucune donnée. Cliquez sur "+ Ajouter une ligne" pour commencer.
                        </td>
                      </tr>
                    ) : (
                      tableData.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-gray-50">
                          {selectedSchema.column_definitions.map((col) => (
                            <td key={col.name} className="px-4 py-2 text-sm">
                              {renderCell(row, col)}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => deleteRow(row.id)}
                              disabled={loading}
                              className="text-red-500 hover:text-red-700 disabled:opacity-50"
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 p-3 border-t text-sm text-gray-600">
                {tableData.length} ligne(s) • Cliquez sur une cellule pour éditer
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
