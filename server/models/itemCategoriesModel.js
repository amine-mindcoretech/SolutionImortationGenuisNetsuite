const pool = require('../config/mysqlConfig');
const { connectODBC } = require('../config/odbcConfig');
const { stringify } = require('csv-stringify');

const itemCategoriesModel = {
  async createTable(forceRecreate = false) {
    const connection = await pool.getConnection();
    try {
      if (forceRecreate) {
        await connection.query('DROP TABLE IF EXISTS itemcategories_import');
        console.log('Table itemcategories_import dropped for recreation');
      }
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS itemcategories_import (
          Name VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci PRIMARY KEY,
          External_ID VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
          Description VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
          cm_gl VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
          pv_gl VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
          dp_gl VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci`;
      await connection.query(createTableQuery);
      connection.release();
      console.log('Table itemcategories_import created successfully');
      return { success: true, message: 'Table itemcategories_import created successfully' };
    } catch (error) {
      console.error('Failed to create table:', error);
      connection.release();
      throw new Error(`Failed to create table: ${error.message}`);
    }
  },

  async fetchGeniusData() {
    const geniusQuery = `
      SELECT DISTINCT
        REPLACE(REPLACE(REPLACE(Famille, '�', 'É'), 'M�TAL', 'MÉTAL'), 'M�TAL', 'MÉTAL') AS Name,
        REPLACE(REPLACE(REPLACE(Famille, '�', 'É'), 'M�TAL', 'MÉTAL'), 'M�TAL', 'MÉTAL') AS External_ID,
        REPLACE(REPLACE(REPLACE(Des, '�', 'É'), 'M�TAL', 'MÉTAL'), 'M�TAL', 'MÉTAL') AS Description,
        CM_GL AS cm_gl,
        Pv_Gl AS pv_gl,
        Dp_Gl AS dp_gl
      FROM Fam
      WHERE FMY_Active = 1 AND Famille <> 'TEST'`;
    try {
      const connection = await connectODBC();
      console.log('Executing ODBC query:', geniusQuery);
      const result = await connection.query(geniusQuery);
      await connection.close();
      console.log('ODBC query result:', result);
      return result;
    } catch (error) {
      console.error('Failed to fetch data from Genius:', error);
      throw new Error(`Failed to fetch data from Genius: ${error.message}`);
    }
  },

  async syncData() {
    try {
      await this.createTable(true); // Force la recréation de la table à chaque synchronisation
      const geniusData = await this.fetchGeniusData();
      const connection = await pool.getConnection();

      const createTempTableQuery = `
        CREATE TEMPORARY TABLE temp_fam_data (
          Name VARCHAR(255),
          External_ID VARCHAR(255),
          Description VARCHAR(255),
          cm_gl VARCHAR(50),
          pv_gl VARCHAR(50),
          dp_gl VARCHAR(50)
        )`;
      await connection.query(createTempTableQuery);
      console.log('Temporary table temp_fam_data created');

      const insertTempQuery = `
        INSERT INTO temp_fam_data (Name, External_ID, Description, cm_gl, pv_gl, dp_gl)
        VALUES ?`;
      const tempValues = geniusData.map(row => [
        row.Name,
        row.External_ID,
        row.Description,
        row.cm_gl,
        row.pv_gl,
        row.dp_gl
      ]);
      if (tempValues.length > 0) {
        await connection.query(insertTempQuery, [tempValues]);
        console.log('Inserted Genius data into temp_fam_data:', tempValues.length, 'rows');
      }

      await connection.query('TRUNCATE TABLE itemcategories_import');
      console.log('Truncated table itemcategories_import');

      const insertFinalQuery = `
        INSERT INTO itemcategories_import (Name, External_ID, Description, cm_gl, pv_gl, dp_gl)
        SELECT Name, External_ID, Description, cm_gl, pv_gl, dp_gl
        FROM temp_fam_data`;
      const [result] = await connection.query(insertFinalQuery);
      console.log('Inserted data into itemcategories_import:', result.affectedRows, 'rows');

      await connection.query('DROP TEMPORARY TABLE IF EXISTS temp_fam_data');
      console.log('Dropped temporary table temp_fam_data');

      connection.release();
      return {
        success: true,
        message: `Synchronization completed: ${result.affectedRows} item categories processed`
      };
    } catch (error) {
      console.error('Failed to sync data:', error);
      throw new Error(`Failed to sync data: ${error.message}`);
    }
  },

  async downloadCSV() {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.query('SELECT * FROM itemcategories_import');
      connection.release();

      const columns = ['Name', 'External_ID', 'Description', 'cm_gl', 'pv_gl', 'dp_gl', 'last_updated'];

      return new Promise((resolve, reject) => {
        const bom = '\uFEFF';
        stringify(rows, {
          header: true,
          columns: columns,
          delimiter: ',',
        }, (err, output) => {
          if (err) {
            console.error('CSV stringify error:', err);
            return reject(new Error(`Failed to generate CSV: ${err.message}`));
          }
          const csvWithBom = bom + output;
          resolve(csvWithBom);
        });
      });
    } catch (error) {
      throw new Error(`Failed to download CSV: ${error.message}`);
    }
  },

  async dropTable() {
    try {
      const connection = await pool.getConnection();
      await connection.query('DROP TABLE IF EXISTS itemcategories_import');
      connection.release();
      return { success: true, message: 'Table itemcategories_import dropped successfully' };
    } catch (error) {
      throw new Error(`Failed to drop table: ${error.message}`);
    }
  }
};

module.exports = itemCategoriesModel;