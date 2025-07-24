const pool = require('../config/mysqlConfig');

const saveVisibleData = async (columns, rows) => {
  const connection = await pool.getConnection();
  try {
    await connection.query('DROP TABLE IF EXISTS clients_visible');

    const createTableQuery = `
      CREATE TABLE clients_visible (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ${columns.map((col) => `\`${col.field}\` VARCHAR(255)`).join(', ')}
      )
    `;
    await connection.query(createTableQuery);

    const insertQuery = `
      INSERT INTO clients_visible (${columns.map((col) => `\`${col.field}\``).join(', ')})
      VALUES ${rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ')}
    `;
    const values = rows.flatMap((row) => columns.map((col) => row[col.field] || null));

    await connection.query(insertQuery, values);
  } finally {
    connection.release();
  }
};

module.exports = { saveVisibleData };
