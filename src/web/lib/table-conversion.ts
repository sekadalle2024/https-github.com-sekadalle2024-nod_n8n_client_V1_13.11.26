type Sheet = { name: string; rows: string[][]; header: boolean; total: number; columns: number };

export interface ColumnMapping {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  required?: boolean;
  options?: string[];
}

export interface ConvertedTable {
  tableName: string;
  displayName: string;
  columnDefinitions: ColumnMapping[];
  rows: Array<Record<string, unknown>>;
}

const numberLike = /^[-+(]?[$€£¥]?\s?\d[\d,.\s]*%?\)?(?:\s?[$€£¥]|\s?[A-Z]{3})?$/;
const datePattern = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
const booleanPattern = /^(true|false|yes|no|y|n|1|0)$/i;

function columnName(index: number): string {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

function detectColumnType(values: string[]): ColumnMapping['type'] {
  const nonEmpty = values.filter(Boolean);
  if (nonEmpty.length === 0) return 'text';

  const numberCount = nonEmpty.filter((v) => numberLike.test(v.trim())).length;
  if (numberCount >= nonEmpty.length * 0.8) return 'number';

  const dateCount = nonEmpty.filter((v) => datePattern.test(v.trim())).length;
  if (dateCount >= nonEmpty.length * 0.8) return 'date';

  const booleanCount = nonEmpty.filter((v) => booleanPattern.test(v.trim())).length;
  if (booleanCount >= nonEmpty.length * 0.8) return 'boolean';

  const unique = new Set(nonEmpty.map((v) => v.trim()));
  if (unique.size <= 10 && unique.size < nonEmpty.length * 0.5) {
    return 'select';
  }

  return 'text';
}

function getSelectOptions(values: string[]): string[] {
  const nonEmpty = values.filter(Boolean).map((v) => v.trim());
  return Array.from(new Set(nonEmpty)).sort();
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[$€£¥%,\s()]/g, '').replace(/^-/, '');
  const negative = value.includes('(') || value.startsWith('-');
  const parsed = parseFloat(cleaned);
  return !Number.isNaN(parsed) ? (negative ? -parsed : parsed) : null;
}

function parseBoolean(value: string): boolean {
  const lower = value.toLowerCase().trim();
  return ['true', 'yes', 'y', '1'].includes(lower);
}

function convertValue(value: string, type: ColumnMapping['type']): unknown {
  if (!value) return null;

  switch (type) {
    case 'number':
      return parseNumber(value);
    case 'boolean':
      return parseBoolean(value);
    case 'date':
    case 'text':
    case 'select':
    default:
      return value;
  }
}

export function detectColumnMappings(sheet: Sheet, useHeader: boolean): ColumnMapping[] {
  const width = Math.max(0, ...sheet.rows.map((row) => row.length));
  const dataRows = useHeader && sheet.rows.length > 1 ? sheet.rows.slice(1) : sheet.rows;

  return Array.from({ length: width }, (_, index) => {
    const headerName = useHeader && sheet.rows[0]?.[index]?.trim();
    const name = headerName || columnName(index);
    const label = headerName || columnName(index);

    const values = dataRows.map((row) => row[index] ?? '');
    const type = detectColumnType(values);

    const mapping: ColumnMapping = {
      name: slugify(name),
      label,
      type,
    };

    if (type === 'select') {
      mapping.options = getSelectOptions(values);
    }

    return mapping;
  });
}

export function convertSheetToAuditTable(
  sheet: Sheet,
  artifactName: string,
  useHeader: boolean,
  columnMappings: ColumnMapping[],
): ConvertedTable {
  const dataRows = useHeader && sheet.rows.length > 1 ? sheet.rows.slice(1) : sheet.rows;

  const rows = dataRows.slice(0, 1000).map((row) => {
    const record: Record<string, unknown> = {};
    columnMappings.forEach((mapping, index) => {
      const cellValue = row[index] ?? '';
      record[mapping.name] = convertValue(cellValue, mapping.type);
    });
    return record;
  });

  const baseTableName = slugify(artifactName);
  const tableName = baseTableName || `table_${Date.now()}`;

  return {
    tableName,
    displayName: artifactName,
    columnDefinitions: columnMappings,
    rows,
  };
}
