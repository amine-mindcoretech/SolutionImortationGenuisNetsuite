const express = require('express');
const router = express.Router();
const odbc = require('odbc');
const fs = require('fs').promises;
const path = require('path');
const iconv = require('iconv-lite');

const OUTPUT_DIR = 'C:\\SQLExports';
const connectionString = 'DSN=GENIUS_READ;UID=genius_read;PWD=egeniusRD*;CHARSET=latin1;MARS_Connection=Yes;';

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Output directory ensured: ${OUTPUT_DIR}`);
    return true;
  } catch (err) {
    console.error('Error creating output directory:', err);
    throw new Error('Failed to create output directory: ' + err.message);
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

// Get non-empty tables
async function getNonEmptyTables(connection) {
  const query = `
    SELECT 
      s.name AS TABLE_SCHEMA,
      t.name AS TABLE_NAME
    FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    INNER JOIN sys.dm_db_partition_stats ps ON t.object_id = ps.object_id
    WHERE t.is_ms_shipped = 0
    AND ps.row_count > 0
    ORDER BY s.name, t.name
  `;
  try {
    const tables = await connection.query(query);
    console.log(`Found ${tables.length} non-empty tables`);
    return tables;
  } catch (err) {
    console.error('Error fetching non-empty tables:', err);
    throw new Error('Failed to fetch non-empty tables: ' + err.message);
  }
}

// Export table structure
async function exportTableStructure(connection) {
  const nonEmptyTables = await getNonEmptyTables(connection);
  if (nonEmptyTables.length === 0) {
    console.warn('No non-empty tables found for structure export');
    return { success: false, message: 'No non-empty tables found for structure export' };
  }

  const tableList = nonEmptyTables.map(t => `'${t.TABLE_SCHEMA}.${t.TABLE_NAME}'`).join(',');
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
    AND (c.TABLE_SCHEMA + '.' + c.TABLE_NAME) IN (${tableList})
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `;
  try {
    const result = await connection.query(query);
    const columns = ['TABLE_SCHEMA', 'TABLE_NAME', 'COLUMN_NAME', 'DATA_TYPE', 'MaxSize', 'IS_NULLABLE'];
    const csvContent = rowsToCSV(result, columns);
    await fs.writeFile(path.join(OUTPUT_DIR, 'structure.csv'), csvContent, 'utf8');
    console.log('Table structure exported to structure.csv');
    return { success: true, message: 'Table structure exported to structure.csv' };
  } catch (err) {
    console.error('Error exporting table structure:', err);
    throw new Error('Failed to export table structure: ' + err.message);
  }
}

// Export foreign key relationships
async function exportForeignKeys(connection) {
  const nonEmptyTables = await getNonEmptyTables(connection);
  if (nonEmptyTables.length === 0) {
    console.warn('No non-empty tables found for relationships export');
    return { success: false, message: 'No non-empty tables found for relationships export' };
  }

  const tableList = nonEmptyTables.map(t => `'${t.TABLE_SCHEMA}.${t.TABLE_NAME}'`).join(',');
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
    INNER JOIN sys.schemas s_src ON t_src.schema_id = s_src.schema_id
    INNER JOIN sys.columns c_src ON c_src.object_id = fk.parent_object_id 
      AND c_src.column_id = fkc.parent_column_id
    INNER JOIN sys.tables t_tgt ON t_tgt.object_id = fk.referenced_object_id
    INNER JOIN sys.schemas s_tgt ON t_tgt.schema_id = s_tgt.schema_id
    INNER JOIN sys.columns c_tgt ON c_tgt.object_id = fk.referenced_object_id 
      AND c_tgt.column_id = fkc.referenced_column_id
    WHERE (s_src.name + '.' + t_src.name) IN (${tableList})
    AND (s_tgt.name + '.' + t_tgt.name) IN (${tableList})
    ORDER BY t_src.name, fk.name
  `;
  try {
    const result = await connection.query(query);
    const columns = ['SourceTable', 'SourceColumn', 'TargetTable', 'TargetColumn', 'ForeignKeyName'];
    const csvContent = rowsToCSV(result, columns);
    await fs.writeFile(path.join(OUTPUT_DIR, 'relations.csv'), csvContent, 'utf8');
    console.log('Foreign key relationships exported to relations.csv');
    return { success: true, message: 'Foreign key relationships exported to relations.csv' };
  } catch (err) {
    console.error('Error exporting foreign keys:', err);
    throw new Error('Failed to export foreign keys: ' + err.message);
  }
}

// Export top 10 rows for each table
async function exportTableData(connection) {
  const nonEmptyTables = await getNonEmptyTables(connection);
  if (nonEmptyTables.length === 0) {
    console.warn('No non-empty tables found for data export');
    return { success: false, message: 'No non-empty tables found for data export', failedTables: [] };
  }

  const failedTables = [];
  for (const table of nonEmptyTables) {
    const schemaName = table.TABLE_SCHEMA;
    const tableName = table.TABLE_NAME;
    try {
      // Get column names, excluding problematic data types
      const columnsQuery = `
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
        AND DATA_TYPE NOT IN ('image', 'text', 'ntext', 'varbinary', 'xml', 'geography', 'geometry', 'timestamp', 'rowversion')
        ORDER BY ORDINAL_POSITION
      `;
      const columns = await connection.query(columnsQuery, [schemaName, tableName]);
      if (columns.length === 0) {
        console.warn(`No eligible columns found for table ${schemaName}.${tableName}, skipping.`);
        failedTables.push({ table: `${schemaName}.${tableName}`, reason: 'No eligible columns found' });
        continue;
      }
      const columnNames = columns.map(col => col.COLUMN_NAME);

      // Get top 10 rows with CAST to handle remaining data types
      const dataQuery = `
        SELECT TOP 10 ${columnNames.map(col => `CAST([${col}] AS NVARCHAR(MAX)) AS [${col}]`).join(',')} 
        FROM [${schemaName}].[${tableName}]
      `;
      const data = await connection.query(dataQuery);
      
      // Convert to CSV
      const csvContent = rowsToCSV(data, columnNames);
      const fileName = `${schemaName}.${tableName}.csv`;
      await fs.writeFile(path.join(OUTPUT_DIR, fileName), csvContent, 'utf8');
      console.log(`Exported top 10 rows for table ${schemaName}.${tableName} to ${fileName}`);
    } catch (err) {
      console.error(`Error exporting table ${schemaName}.${tableName}:`, err);
      failedTables.push({ table: `${schemaName}.${tableName}`, reason: err.message, details: err.odbcErrors });
    }
  }
  return { 
    success: failedTables.length === 0, 
    message: `Table data export completed with ${failedTables.length} failures`, 
    failedTables 
  };
}

// Routes
router.get('/structure', async (req, res) => {
  let connection;
  try {
    await ensureOutputDir();
    connection = await odbc.connect(connectionString);
    const result = await exportTableStructure(connection);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

router.get('/relations', async (req, res) => {
  let connection;
  try {
    await ensureOutputDir();
    connection = await odbc.connect(connectionString);
    const result = await exportForeignKeys(connection);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

router.get('/data', async (req, res) => {
  let connection;
  try {
    await ensureOutputDir();
    connection = await odbc.connect(connectionString);
    const result = await exportTableData(connection);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

router.get('/all', async (req, res) => {
  let connection;
  try {
    await ensureOutputDir();
    connection = await odbc.connect(connectionString);
    const structureResult = await exportTableStructure(connection);
    const relationsResult = await exportForeignKeys(connection);
    const dataResult = await exportTableData(connection);
    res.json({
      success: structureResult.success && relationsResult.success && dataResult.success,
      message: 'Full export completed',
      details: {
        structure: structureResult.message,
        relations: relationsResult.message,
        data: dataResult.message,
        failedTables: dataResult.failedTables
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;