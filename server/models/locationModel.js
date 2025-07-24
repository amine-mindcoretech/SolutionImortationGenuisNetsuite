const pool = require('../config/mysqlConfig');
const { connectODBC } = require('../config/odbcConfig');
const { stringify } = require('csv-stringify');

const locationModel = {
  async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS locationgenius_import (
        name VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci PRIMARY KEY,
        External_ID VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        parent VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        subsidiary VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        locationtype VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        timezone VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        usebins VARCHAR(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        makeinventoryavailable VARCHAR(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        usewarehousemanagement VARCHAR(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        includeinsupplyplanning VARCHAR(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        includeincontroltower VARCHAR(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        addr1 VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        city VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        country VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        state VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        zip VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        addrphone VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci`;
    try {
      const connection = await pool.getConnection();
      await connection.query(createTableQuery);
      connection.release();
      console.log('Table locationgenius_import created successfully');
      return { success: true, message: 'Table locationgenius_import created successfully' };
    } catch (error) {
      console.error('Failed to create table:', error);
      throw new Error(`Failed to create table: ${error.message}`);
    }
  },

  async fetchGeniusData() {
    const geniusQuery = `
      SELECT DISTINCT
        CASE 
          WHEN Nom LIKE 'TOURMAC INC.' THEN 'TOURMAC'
          WHEN Nom LIKE 'ECOLE DE TECHNOLOGIE SUPERIEURE (ETS)' THEN 'ETS'
          WHEN Nom LIKE 'USINAGE CNC PARADIS' THEN 'CNC PARADIS'
          WHEN Nom LIKE 'M.E.A.TEC' THEN 'MECTOR'
          WHEN Nom LIKE 'GROUPE LEV-FAB INC.' THEN 'LEVFAB'
          WHEN Nom LIKE 'USINAGE LAC MASSON INC' THEN 'USINAGE LAC MASSON'
          WHEN Nom LIKE 'RAPID PRECISION INDUSTRIES' THEN 'RAPID PRECISION INDUSTRIES' 
          WHEN Nom LIKE 'USINATEK MR INC.' THEN 'USINATEK MR'
          WHEN Nom LIKE 'FERROTECH MENARD' THEN 'FERROTECH'
          WHEN Nom LIKE 'ENVITECH AUTOMATION' THEN 'ENVITECH AUTOMATION'
          WHEN Nom LIKE 'SOLUTION USINAGE' THEN 'SOLUTION USINAGE'
          WHEN Nom LIKE 'ULTIMAXS' THEN 'ULTIMAXS'
          WHEN Nom LIKE '9518-8629 QC INC.' THEN 'ATELIER D''USINAGE GOBEIL'
          WHEN Nom LIKE 'CUSTOM ELECTRONICS INC.' THEN 'CUSTOM ELECTRONICS INC'        
          WHEN Nom LIKE 'EPP METAL' THEN 'EPP MÉTAL'
          WHEN Nom LIKE 'PRO-STEL INC.' THEN 'PRO-STEL'
          WHEN Nom LIKE 'SCHOLER INDUSTRIEL' THEN 'SCHOLER'
          WHEN Nom LIKE 'METAL CN' THEN 'MÉTAL CN INC'
          WHEN Nom LIKE 'USINAGE PROTECH' THEN 'USINAGE PROTECH'
          WHEN Nom LIKE 'REICAR TECH INC' THEN 'REICAR'
          WHEN Nom LIKE 'MDL ENERGIE INC.' THEN 'MDL ENERGIE'
          WHEN Nom LIKE 'PRECISION PLATING' THEN 'PRECISION PLATING'
          WHEN Nom LIKE 'EXEL INTERNATIONAL' THEN 'PLACAGE EXEL'
          WHEN Nom LIKE 'ATELIER D''USINAGE MEC-TOR' THEN 'MEA TECH'
          WHEN Nom LIKE 'MSG INDUSTRIES INC.' THEN 'MSG INDUSTRIES'
          WHEN Nom LIKE 'MICRON AUTOMATIQUE' THEN 'MICRON'
          ELSE REPLACE(REPLACE(REPLACE(Nom, '�', 'É'), 'M�TAL', 'MÉTAL'), 'M�TAL', 'MÉTAL')
        END AS name,
        CASE 
          WHEN Nom LIKE 'TOURMAC INC.' THEN 'TOURMAC'
          WHEN Nom LIKE 'ECOLE DE TECHNOLOGIE SUPERIEURE (ETS)' THEN 'ETS'
          WHEN Nom LIKE 'USINAGE CNC PARADIS' THEN 'CNC PARADIS'
          WHEN Nom LIKE 'M.E.A.TEC' THEN 'MECTOR'
          WHEN Nom LIKE 'GROUPE LEV-FAB INC.' THEN 'LEVFAB'
          WHEN Nom LIKE 'USINAGE LAC MASSON INC' THEN 'USINAGE LAC MASSON'
          WHEN Nom LIKE 'RAPID PRECISION INDUSTRIES' THEN 'RAPID PRECISION INDUSTRIES' 
          WHEN Nom LIKE 'USINATEK MR INC.' THEN 'USINATEK MR'
          WHEN Nom LIKE 'FERROTECH MENARD' THEN 'FERROTECH'
          WHEN Nom LIKE 'ENVITECH AUTOMATION' THEN 'ENVITECH AUTOMATION'
          WHEN Nom LIKE 'SOLUTION USINAGE' THEN 'SOLUTION USINAGE'
          WHEN Nom LIKE 'ULTIMAXS' THEN 'ULTIMAXS'
          WHEN Nom LIKE '9518-8629 QC INC.' THEN 'ATELIER D''USINAGE GOBEIL'
          WHEN Nom LIKE 'CUSTOM ELECTRONICS INC.' THEN 'CUSTOM ELECTRONICS INC'        
          WHEN Nom LIKE 'EPP METAL' THEN 'EPP MÉTAL'
          WHEN Nom LIKE 'PRO-STEL INC.' THEN 'PRO-STEL'
          WHEN Nom LIKE 'SCHOLER INDUSTRIEL' THEN 'SCHOLER'
          WHEN Nom LIKE 'METAL CN' THEN 'MÉTAL CN INC'
          WHEN Nom LIKE 'USINAGE PROTECH' THEN 'USINAGE PROTECH'
          WHEN Nom LIKE 'REICAR TECH INC' THEN 'REICAR'
          WHEN Nom LIKE 'MDL ENERGIE INC.' THEN 'MDL ENERGIE'
          WHEN Nom LIKE 'PRECISION PLATING' THEN 'PRECISION PLATING'
          WHEN Nom LIKE 'EXEL INTERNATIONAL' THEN 'PLACAGE EXEL'
          WHEN Nom LIKE 'ATELIER D''USINAGE MEC-TOR' THEN 'MEA TECH'
          WHEN Nom LIKE 'MSG INDUSTRIES INC.' THEN 'MSG INDUSTRIES'
          WHEN Nom LIKE 'MICRON AUTOMATIQUE' THEN 'MICRON'
          ELSE REPLACE(REPLACE(REPLACE(Nom, '�', 'É'), 'M�TAL', 'MÉTAL'), 'M�TAL', 'MÉTAL')
        END AS External_ID,
        '' AS parent,
        'Parent Company : Mindcore' AS subsidiary,
        CASE 
          WHEN Nom LIKE '9518-8629 QC INC.' THEN 'Warehouse'
          ELSE ''
        END AS locationtype,
        '(GMT-05:00) Eastern Time (US & Canada)' AS timezone,
        'T' AS usebins,
        'T' AS makeinventoryavailable,
        'T' AS usewarehousemanagement,
        'F' AS includeinsupplyplanning,
        'F' AS includeincontroltower,
        Adresse AS addr1,
        Ville AS city,
        Pays AS pays,
        Province AS province,
        Codepostal AS zip,
        Telephone AS addrphone
      FROM Fou
      WHERE Nom LIKE 'TOURMAC INC.'
        OR Nom LIKE 'ECOLE DE TECHNOLOGIE SUPERIEURE (ETS)'
        OR Nom LIKE 'USINAGE CNC PARADIS'
        OR Nom LIKE 'M.E.A.TEC'
        OR Nom LIKE 'GROUPE LEV-FAB INC.'
        OR Nom LIKE 'USINAGE LAC MASSON INC'
        OR Nom LIKE 'RAPID PRECISION INDUSTRIES'
        OR Nom LIKE 'USINATEK MR INC.'
        OR Nom LIKE 'FERROTECH MENARD'
        OR Nom LIKE 'ENVITECH AUTOMATION'
        OR Nom LIKE 'SOLUTION USINAGE'
        OR Nom LIKE 'ULTIMAXS'
        OR Nom LIKE '9518-8629 QC INC.'
        OR Nom LIKE 'CUSTOM ELECTRONICS INC.'
        OR Nom LIKE 'EPP METAL'
        OR Nom LIKE 'PRO-STEL INC.'
        OR Nom LIKE 'SCHOLER INDUSTRIEL'
        OR Nom LIKE 'METAL CN'
        OR Nom LIKE 'USINAGE PROTECH'
        OR Nom LIKE 'REICAR TECH INC'
        OR Nom LIKE 'MDL ENERGIE INC.'
        OR Nom LIKE 'PRECISION PLATING'
        OR Nom LIKE 'EXEL INTERNATIONAL'
        OR Nom LIKE 'ATELIER D''USINAGE MEC-TOR'
        OR Nom LIKE 'MSG INDUSTRIES INC.'
        OR Nom LIKE 'MICRON AUTOMATIQUE'
    `;
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
      await this.createTable();
      const geniusData = await this.fetchGeniusData();
      const connection = await pool.getConnection();

      // Step 1: Create a temporary table to store the Genius data
      const createTempTableQuery = `
        CREATE TEMPORARY TABLE temp_fou_data (
          name VARCHAR(255),
          External_ID VARCHAR(255),
          parent VARCHAR(255),
          subsidiary VARCHAR(255),
          locationtype VARCHAR(50),
          timezone VARCHAR(100),
          usebins VARCHAR(10),
          makeinventoryavailable VARCHAR(10),
          usewarehousemanagement VARCHAR(10),
          includeinsupplyplanning VARCHAR(10),
          includeincontroltower VARCHAR(10),
          addr1 VARCHAR(255),
          city VARCHAR(255),
          pays VARCHAR(100),
          province VARCHAR(100),
          zip VARCHAR(50),
          addrphone VARCHAR(50)
        )`;
      await connection.query(createTempTableQuery);
      console.log('Temporary table temp_fou_data created');

      // Step 2: Insert the Genius data into the temporary table with comma removal from addr1
      const insertTempQuery = `
        INSERT INTO temp_fou_data (
          name, External_ID, parent, subsidiary, locationtype, timezone, usebins,
          makeinventoryavailable, usewarehousemanagement, includeinsupplyplanning,
          includeincontroltower, addr1, city, pays, province, zip, addrphone
        )
        VALUES ?
      `;
      const tempValues = geniusData.map(row => [
        row.name,
        row.External_ID,
        row.parent,
        row.subsidiary,
        row.locationtype,
        row.timezone,
        row.usebins,
        row.makeinventoryavailable,
        row.usewarehousemanagement,
        row.includeinsupplyplanning,
        row.includeincontroltower,
        row.addr1 ? row.addr1.replace(/,/g, '') : row.addr1,
        row.city,
        row.pays,
        row.province,
        row.zip,
        row.addrphone
      ]);
      if (tempValues.length > 0) {
        await connection.query(insertTempQuery, [tempValues]);
        console.log('Inserted Genius data into temp_fou_data:', tempValues.length, 'rows');
      }

      // Step 3: Join with pays_province_mapping in MySQL and insert into locationgenius_import
      await connection.query('TRUNCATE TABLE locationgenius_import');
      console.log('Truncated table locationgenius_import');

      const insertFinalQuery = `
        INSERT INTO locationgenius_import (
          name, External_ID, parent, subsidiary, locationtype, timezone, usebins,
          makeinventoryavailable, usewarehousemanagement, includeinsupplyplanning,
          includeincontroltower, addr1, city, country, state, zip, addrphone
        )
        SELECT 
          t.name,
          t.External_ID,
          t.parent,
          t.subsidiary,
          t.locationtype,
          t.timezone,
          t.usebins,
          t.makeinventoryavailable,
          t.usewarehousemanagement,
          t.includeinsupplyplanning,
          t.includeincontroltower,
          t.addr1,
          t.city,
          COALESCE(ppm.paysnetsuite, t.pays, '') AS country,
          COALESCE(ppm.provincenetsuite, t.province, '') AS state,
          t.zip,
          t.addrphone
        FROM temp_fou_data t
        LEFT JOIN pays_province_mapping ppm 
          ON t.pays = ppm.paysgenius AND t.province = ppm.provincegenius
      `;
      const [result] = await connection.query(insertFinalQuery);
      console.log('Inserted data into locationgenius_import:', result.affectedRows, 'rows');

      // Step 4: Drop the temporary table
      await connection.query('DROP TEMPORARY TABLE IF EXISTS temp_fou_data');
      console.log('Dropped temporary table temp_fou_data');

      connection.release();
      return {
        success: true,
        message: `Synchronization completed: ${result.affectedRows} locations processed`
      };
    } catch (error) {
      console.error('Failed to sync data:', error);
      throw new Error(`Failed to sync data: ${error.message}`);
    }
  },

  async downloadCSV() {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.query('SELECT * FROM locationgenius_import');
      connection.release();

      const columns = [
        'name', 'External_ID', 'parent', 'subsidiary', 'locationtype', 'timezone', 'usebins',
        'makeinventoryavailable', 'usewarehousemanagement', 'includeinsupplyplanning',
        'includeincontroltower', 'addr1', 'city', 'country', 'state', 'zip', 'addrphone', 'last_updated'
      ];

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
      await connection.query('DROP TABLE IF EXISTS locationgenius_import');
      connection.release();
      return { success: true, message: 'Table locationgenius_import dropped successfully' };
    } catch (error) {
      throw new Error(`Failed to drop table: ${error.message}`);
    }
  }
};

module.exports = locationModel;