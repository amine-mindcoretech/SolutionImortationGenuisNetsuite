const odbc = require('odbc');
const fs = require('fs').promises;
const path = require('path');
const iconv = require('iconv-lite');

// Configuration
const OUTPUT_DIR = 'C:\\SQLExports'; // Adjust path as needed, ensure it exists
const connectionString = 'DSN=GENIUS_READ;UID=genius_read;PWD=egeniusRD*;CHARSET=latin1;MARS_Connection=Yes;';

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Output directory ensured: ${OUTPUT_DIR}`);
  } catch (err) {
    console.error('Error creating output directory:', err);
    throw err;
  }
}

// Convert to UTF-8 and clean invalid characters
function convertToUTF8(value) {
  if (typeof value === 'string') {
    let convertedValue = iconv.decode(Buffer.from(value, 'binary'), 'windows-1252');
    if (convertedValue.includes('�')) {
      convertedValue = iconv.decode(Buffer.from(value, 'binary'), 'ISO-8859-1');
    }
    return cleanInvalidChars(convertedValue);
  }
  return value;
}

function cleanInvalidChars(value) {
  if (typeof value === 'string') {
    return value
      .replace(/ý/g, 'É')
      .replace(/ÿ/g, 'é')
      .replace(/þ/g, 'è')
      .replace(/Ý/g, 'À')
      .replace(/�/g, '');
  }
  return value;
}

// Format value for CSV
function formatForCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

// Convert rows to CSV string
function rowsToCSV(rows, columns) {
  if (!rows || rows.length === 0) return '';
  const header = columns.map(col => formatForCSV(col)).join(',');
  const data = rows.map(row =>
    columns.map(col => formatForCSV(convertToUTF8(row[col]))).join(',')
  );
  return [header, ...data].join('\n');
}

// Export table structure
async function exportTableStructure(connection) {
  const query = `
    SELECT 
      c.TABLE_SCHEMA,
      c.TABLE_NAME,
      c.COLUMN_NAME,
      CASE 
        WHEN c.DATA_TYPE IN ('varchar','char','nvarchar','nchar','binary','varbinary') 
          THEN COALESCE(
            CASE WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX' 
                 ELSE CONVERT(VARCHAR(10), c.CHARACTER_MAXIMUM_LENGTH) 
            END, '')
        WHEN c.DATA_TYPE IN ('numeric','decimal') 
          THEN CONVERT(VARCHAR(10), c.NUMERIC_PRECISION) + ',' + CONVERT(VARCHAR(10), c.NUMERIC_SCALE)
        ELSE c.DATA_TYPE
      END AS DATA_TYPE,
      CASE 
        WHEN c.DATA_TYPE IN ('varchar','char','nvarchar','nchar','binary','varbinary') 
          THEN COALESCE(
            CASE WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX' 
                 ELSE CONVERT(VARCHAR(10), c.CHARACTER_MAXIMUM_LENGTH) 
            END, '')
        WHEN c.DATA_TYPE IN ('numeric','decimal') 
          THEN CONVERT(VARCHAR(10), c.NUMERIC_PRECISION) + ',' + CONVERT(VARCHAR(10), c.NUMERIC_SCALE)
        ELSE ''
      END AS MaxSize,
      c.IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS AS c
    JOIN INFORMATION_SCHEMA.TABLES AS t 
      ON c.TABLE_NAME = t.TABLE_NAME AND c.TABLE_SCHEMA = t.TABLE_SCHEMA
    WHERE t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `;
  try {
    const result = await connection.query(query);
    const columns = ['TABLE_SCHEMA', 'TABLE_NAME', 'COLUMN_NAME', 'DATA_TYPE', 'MaxSize', 'IS_NULLABLE'];
    const csvContent = rowsToCSV(result, columns);
    await fs.writeFile(path.join(OUTPUT_DIR, 'structure.csv'), csvContent, 'utf8');
    console.log('Table structure exported to structure.csv');
  } catch (err) {
    console.error('Error exporting table structure:', err);
    throw new Error('Failed to export table structure: ' + err.message);
  }
}

// Export foreign key relationships
async function exportForeignKeys(connection) {
  const query = `
    SELECT 
      t_src.name AS SourceTable,
      c_src.name AS SourceColumn,
      t_tgt.name AS TargetTable,
      c_tgt.name AS TargetColumn,
      fk.name AS ForeignKeyName
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    INNER JOIN sys.tables t_src ON t_src.object_id = fk.parent_object_id
    INNER JOIN sys.columns c_src ON c_src.object_id = fk.parent_object_id 
      AND c_src.column_id = fkc.parent_column_id
    INNER JOIN sys.tables t_tgt ON t_tgt.object_id = fk.referenced_object_id
    INNER JOIN sys.columns c_tgt ON c_tgt.object_id = fk.referenced_object_id 
      AND c_tgt.column_id = fkc.referenced_column_id
    ORDER BY t_src.name, fk.name
  `;
  try {
    const result = await connection.query(query);
    const columns = ['SourceTable', 'SourceColumn', 'TargetTable', 'TargetColumn', 'ForeignKeyName'];
    const csvContent = rowsToCSV(result, columns);
    await fs.writeFile(path.join(OUTPUT_DIR, 'relations.csv'), csvContent, 'utf8');
    console.log('Foreign key relationships exported to relations.csv');
  } catch (err) {
    console.error('Error exporting foreign keys:', err);
    throw new Error('Failed to export foreign keys: ' + err.message);
  }
}

// Export top 10 rows for each table
async function exportTableData(connection) {
  const tablesQuery = `
    SELECT TABLE_SCHEMA, TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE'
  `;
  let tables;
  try {
    tables = await connection.query(tablesQuery);
    console.log(`Found ${tables.length} tables`);
  } catch (err) {
    console.error('Error fetching table list:', err);
    throw new Error('Failed to fetch table list: ' + err.message);
  }

  for (const table of tables) {
    const schemaName = table.TABLE_SCHEMA;
    const tableName = table.TABLE_NAME;
    try {
      // Get column names
      const columnsQuery = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
        ORDER BY ORDINAL_POSITION
      `;
      const columns = await connection.query(columnsQuery, [schemaName, tableName]);
      if (columns.length === 0) {
        console.warn(`No columns found for table ${schemaName}.${tableName}, skipping.`);
        continue;
      }
      const columnNames = columns.map(col => col.COLUMN_NAME);

      // Get top 10 rows
      const dataQuery = `
        SELECT TOP 10 ${columnNames.map(col => `[${col}]`).join(',')} 
        FROM [${schemaName}].[${tableName}]
      `;
      const data = await connection.query(dataQuery);
      
      // Convert to CSV
      const csvContent = rowsToCSV(data, columnNames);
      await fs.writeFile(path.join(OUTPUT_DIR, `${schemaName}_${tableName}.csv`), csvContent, 'utf8');
      console.log(`Exported top 10 rows for table ${schemaName}.${tableName}`);
    } catch (err) {
      console.error(`Error exporting table ${schemaName}.${tableName}:`, err);
      // Continue to next table
    }
  }
}

// Main export function
async function exportDatabase() {
  let connection;
  try {
    await ensureOutputDir();
    connection = await odbc.connect(connectionString);
    await exportTableStructure(connection);
    await exportForeignKeys(connection);
    await exportTableData(connection);
    console.log(`Export completed. Files saved to ${OUTPUT_DIR}`);
    return { success: true, message: `Export completed. Files saved to ${OUTPUT_DIR}` };
  } catch (err) {
    console.error('Export error:', err);
    throw new Error('Failed to export database: ' + err.message);
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { exportDatabase };