// const pool = require('../config/mysqlConfig');
// const { connectODBC } = require('../config/odbcConfig');


// // Helper functions for encoding
// const convertToUTF8 = (value) => {
//   if (typeof value === 'string') {
//     // Try latin1 first, fall back to windows-1252 if needed
//     try {
//       return Buffer.from(value, 'latin1').toString('utf8');
//     } catch (e) {
//       return Buffer.from(value, 'win1252').toString('utf8');
//     }
//   }
//   return value;
// };

// const cleanInvalidChars = (value) => {
//   if (typeof value === 'string') {
//     // Replace invalid UTF-8 characters with a replacement character
//     return value.replace(/[\x00-\x1F\x7F-\x9F]/g, '').replace(/�/g, '');
//   }
//   return value;
// };

// const logProblematicChars = (row) => {
//   Object.keys(row).forEach((key) => {
//     if (typeof row[key] === 'string' && row[key].includes('?')) {
//       console.log(`Warning: Question mark found in ${key}: ${row[key]}`);
//     }
//   });
// };

// const fournisseurModel = {
//   // Create the fournisseurgenius table
//   async createTable() {
//     const createTableQuery = `
//       CREATE TABLE IF NOT EXISTS fournisseurgenius (
//         custentity_gs_vendor_number VARCHAR(50) CHARACTER SET utf8mb4 PRIMARY KEY,
//         vendorId VARCHAR(255) CHARACTER SET utf8mb4,
//         companyName VARCHAR(255) CHARACTER SET utf8mb4,
//         printOnCheckAs VARCHAR(255) CHARACTER SET utf8mb4,
//         address1_line1 VARCHAR(255) CHARACTER SET utf8mb4,
//         address1_line2 VARCHAR(255) CHARACTER SET utf8mb4,
//         address1_city VARCHAR(100) CHARACTER SET utf8mb4,
//         address1_state VARCHAR(100) CHARACTER SET utf8mb4,
//         address1_countrys VARCHAR(100) CHARACTER SET utf8mb4,
//         address1_zipCode VARCHAR(20) CHARACTER SET utf8mb4,
//         phone VARCHAR(50) CHARACTER SET utf8mb4,
//         fax VARCHAR(50) CHARACTER SET utf8mb4,
//         First VARCHAR(100) CHARACTER SET utf8mb4,
//         Middle VARCHAR(100) CHARACTER SET utf8mb4,
//         Last VARCHAR(100) CHARACTER SET utf8mb4,
//         terms VARCHAR(50) CHARACTER SET utf8mb4,
//         currency VARCHAR(10) CHARACTER SET utf8mb4,
//         custentity_gs_ship_mth VARCHAR(50) CHARACTER SET utf8mb4,
//         language VARCHAR(50) CHARACTER SET utf8mb4,
//         incoterm VARCHAR(50) CHARACTER SET utf8mb4,
//         email VARCHAR(255) CHARACTER SET utf8mb4,
//         custentity_gs_str_date DATE,
//         category VARCHAR(50) CHARACTER SET utf8mb4,
//         externalid VARCHAR(255) CHARACTER SET utf8mb4,
//         custentity_gs_pay_mth_ven VARCHAR(50) CHARACTER SET utf8mb4,
//         EFT CHAR(1),
//         address1_defaultShipping CHAR(1),
//         address1_defaultBilling CHAR(1),
//         Legalname VARCHAR(255) CHARACTER SET utf8mb4,
//         is1099Eligible CHAR(1),
//         isPerson CHAR(1),
//         subsidiary VARCHAR(50) CHARACTER SET utf8mb4,
//         last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//       ) DEFAULT CHARACTER SET utf8mb4`;
//     try {
//       const connection = await pool.getConnection();
//       await connection.query(createTableQuery);
//       connection.release();
//       return { success: true, message: 'Table fournisseurgenius created successfully' };
//     } catch (error) {
//       throw new Error(`Failed to create table: ${error.message}`);
//     }
//   },

//   // Create a temporary table for raw Genius data
//   async createTempTable() {
//     const createTempTableQuery = `
//       CREATE TABLE IF NOT EXISTS temp_fournisseur_genius (
//         F_No VARCHAR(50) CHARACTER SET utf8mb4,
//         Nom VARCHAR(255) CHARACTER SET utf8mb4,
//         CheckName VARCHAR(255) CHARACTER SET utf8mb4,
//         Adresse VARCHAR(255) CHARACTER SET utf8mb4,
//         VDS_Address2 VARCHAR(255) CHARACTER SET utf8mb4,
//         Ville VARCHAR(100) CHARACTER SET utf8mb4,
//         Pays VARCHAR(100) CHARACTER SET utf8mb4,
//         Province VARCHAR(100) CHARACTER SET utf8mb4,
//         Codepostal VARCHAR(20) CHARACTER SET utf8mb4,
//         Telephone VARCHAR(50) CHARACTER SET utf8mb4,
//         Fax VARCHAR(50) CHARACTER SET utf8mb4,
//         contact VARCHAR(255) CHARACTER SET utf8mb4,
//         Termeach VARCHAR(50) CHARACTER SET utf8mb4,
//         Devise VARCHAR(10) CHARACTER SET utf8mb4,
//         Transport VARCHAR(50) CHARACTER SET utf8mb4,
//         langue VARCHAR(50) CHARACTER SET utf8mb4,
//         Modeexp VARCHAR(50) CHARACTER SET utf8mb4,
//         datecree DATE,
//         Classification VARCHAR(50) CHARACTER SET utf8mb4,
//         vds_link VARCHAR(255) CHARACTER SET utf8mb4,
//         PaymentModeId INT
//       ) DEFAULT CHARACTER SET utf8mb4`;
//     try {
//       const connection = await pool.getConnection();
//       await connection.query(createTempTableQuery);
//       connection.release();
//       return { success: true, message: 'Temporary table created successfully' };
//     } catch (error) {
//       throw new Error(`Failed to create temporary table: ${error.message}`);
//     }
//   },

//   // Fetch raw data from Genius ERP (Fou table)
//   async fetchGeniusData() {
//     const geniusQuery = `
//       SELECT 
//         F_No,
//         Nom,
//         CheckName,
//         Adresse,
//         VDS_Address2,
//         Ville,
//         Pays,
//         Province,
//         Codepostal,
//         Telephone,
//         Fax,
//         contact,
//         Termeach,
//         Devise,
//         Transport,
//         langue,
//         Modeexp,
//         datecree,
//         Classification,
//         vds_link,
//         PaymentModeId
//       FROM Fou
//       WHERE 
//         Actif = 'O' 
//         AND F_no = VDS_PaidToVendorLink 
//         AND (Pays = 'CANADA' OR Pays = 'USA')
//         AND Adresse <> ''
//         AND F_NO NOT LIKE '%-%'
//         AND Modeexp NOT IN ('PPC', 'COD', 'COLLECT')
//     `;
//     try {
//       const connection = await connectODBC();
//       const result = await connection.query(geniusQuery);
//       await connection.close();
//       // Clean and convert encoding
//       const cleanedData = result.map((row) => {
//         Object.keys(row).forEach((key) => {
//           let convertedValue = convertToUTF8(row[key]);
//           row[key] = cleanInvalidChars(convertedValue);
//         });
//         logProblematicChars(row); // Log rows with question marks
//         return row;
//       });
//       return cleanedData;
//     } catch (error) {
//       throw new Error(`Failed to fetch data from Genius: ${error.message}`);
//     }
//   },

//   // Synchronize data to MySQL (incremental update)
//   async syncData() {
//     try {
//       // Create both tables if they don't exist
//       await this.createTable();
//       await this.createTempTable();

//       // Fetch and insert raw Genius data into temporary table
//       const geniusData = await this.fetchGeniusData();
//       const connection = await pool.getConnection();
//       // Set connection charset to utf8mb4
//       await connection.query('SET NAMES utf8mb4');
//       await connection.query('TRUNCATE TABLE temp_fournisseur_genius'); // Clear temp table
//       const insertTempQuery = `
//         INSERT INTO temp_fournisseur_genius (
//           F_No, Nom, CheckName, Adresse, VDS_Address2, Ville, Pays, Province, Codepostal,
//           Telephone, Fax, contact, Termeach, Devise, Transport, langue, Modeexp, datecree,
//           Classification, vds_link, PaymentModeId
//         ) VALUES ?
//       `;
//       const tempValues = geniusData.map(row => [
//         row.F_No, row.Nom, row.CheckName, row.Adresse, row.VDS_Address2, row.Ville,
//         row.Pays, row.Province, row.Codepostal, row.Telephone, row.Fax, row.contact,
//         row.Termeach, row.Devise, row.Transport, row.langue, row.Modeexp, row.datecree,
//         row.Classification, row.vds_link, row.PaymentModeId
//       ]);
//       if (tempValues.length > 0) {
//         await connection.query(insertTempQuery, [tempValues]);
//       }

//       // Transform data with mapping tables and insert into final table
//       const transformQuery = `
//         INSERT INTO fournisseurgenius (
//           custentity_gs_vendor_number, vendorId, companyName, printOnCheckAs, address1_line1, address1_line2,
//           address1_city, address1_state, address1_countrys, address1_zipCode, phone, fax, First, Middle, Last,
//           terms, currency, custentity_gs_ship_mth, language, incoterm, email, custentity_gs_str_date, category,
//           externalid, custentity_gs_pay_mth_ven, EFT, address1_defaultShipping, address1_defaultBilling,
//           Legalname, is1099Eligible, isPerson, subsidiary
//         )
//         SELECT 
//           Fou.F_No AS custentity_gs_vendor_number,
//           Fou.Nom AS vendorId,
//           Fou.Nom AS companyName,
//           CASE WHEN Fou.CheckName = Fou.Nom THEN '' ELSE Fou.CheckName END AS printOnCheckAs,
//           Fou.Adresse AS address1_line1,
//           Fou.VDS_Address2 AS address1_line2,
//           Fou.Ville AS address1_city,
//           ppm.provincenetsuite AS address1_state,
//           ppm.paysnetsuite AS address1_countrys,
//           Fou.Codepostal AS address1_zipCode,
//           Fou.Telephone AS phone,
//           Fou.Fax AS fax,
//           CASE 
//             WHEN LOCATE(' ', Fou.contact) = 0 THEN Fou.contact
//             WHEN LOCATE(' ', Fou.contact, LOCATE(' ', Fou.contact) + 1) = 0 THEN 
//               LEFT(Fou.contact, LOCATE(' ', Fou.contact) - 1)
//             ELSE 
//               LEFT(Fou.contact, LOCATE(' ', Fou.contact) - 1)
//           END AS First,
//           CASE 
//             WHEN LOCATE(' ', Fou.contact) = 0 THEN NULL
//             WHEN LOCATE(' ', Fou.contact, LOCATE(' ', Fou.contact) + 1) = 0 THEN NULL
//             ELSE 
//               SUBSTRING(
//                 Fou.contact, 
//                 LOCATE(' ', Fou.contact) + 1, 
//                 LOCATE(' ', Fou.contact, LOCATE(' ', Fou.contact) + 1) - LOCATE(' ', Fou.contact) - 1
//               )
//           END AS Middle,
//           CASE 
//             WHEN LOCATE(' ', Fou.contact) = 0 THEN NULL
//             WHEN LOCATE(' ', Fou.contact, LOCATE(' ', Fou.contact) + 1) = 0 THEN 
//               SUBSTRING(Fou.contact, LOCATE(' ', Fou.contact) + 1)
//             ELSE 
//               SUBSTRING(Fou.contact, LOCATE(' ', Fou.contact, LOCATE(' ', Fou.contact) + 1) + 1)
//           END AS Last,
//           tm.terms_netsuite AS terms,
//           cm.currency_netsuite AS currency,
//           tpm.netsuite_transport AS custentity_gs_ship_mth,
//           CASE
//             WHEN Fou.langue = 'FRENCH' THEN 'French (Canada)'
//             WHEN Fou.langue = 'ENGLISH' THEN 'English (U.S.)'
//             ELSE ''
//           END AS language,
//           incom.incoterm_netsuite AS incoterm,
//           '' AS email,
//           CAST(Fou.datecree AS DATE) AS custentity_gs_str_date,
//           catm.netsuitecategory AS category,
//           Fou.vds_link AS externalid,
//           modepm.internal_id_netsuite AS custentity_gs_pay_mth_ven,
//           CASE WHEN Fou.PaymentModeId = 2 THEN 'T' ELSE 'F' END AS EFT,
//           'T' AS address1_defaultShipping,
//           'T' AS address1_defaultBilling,
//           '' AS Legalname,
//           'F' AS is1099Eligible,
//           'F' AS isPerson,
//           'Mindcore' AS subsidiary
//         FROM temp_fournisseur_genius Fou
//         LEFT JOIN terms_mapping tm ON Fou.Termeach = tm.terms_genius 
//         LEFT JOIN currency_mapping cm ON Fou.Devise = cm.currency_genius
//         LEFT JOIN transport_mapping tpm ON Fou.Transport = tpm.genius_transport 
//         LEFT JOIN incoterm_mapping incom ON Fou.Modeexp = incom.incoterm_genius 
//         LEFT JOIN modepaiement_mapping modepm ON Fou.PaymentModeId = modepm.id_genuis 
//         LEFT JOIN pays_province_mapping ppm ON Fou.Pays = ppm.paysgenius AND Fou.Province = ppm.provincegenius 
//         LEFT JOIN category_mapping catm ON Fou.Classification = catm.geniuscategory
//         ON DUPLICATE KEY UPDATE
//           vendorId = VALUES(vendorId),
//           companyName = VALUES(companyName),
//           printOnCheckAs = VALUES(printOnCheckAs),
//           address1_line1 = VALUES(address1_line1),
//           address1_line2 = VALUES(address1_line2),
//           address1_city = VALUES(address1_city),
//           address1_state = VALUES(address1_state),
//           address1_countrys = VALUES(address1_countrys),
//           address1_zipCode = VALUES(address1_zipCode),
//           phone = VALUES(phone),
//           fax = VALUES(fax),
//           First = VALUES(First),
//           Middle = VALUES(Middle),
//           Last = VALUES(Last),
//           terms = VALUES(terms),
//           currency = VALUES(currency),
//           custentity_gs_ship_mth = VALUES(custentity_gs_ship_mth),
//           language = VALUES(language),
//           incoterm = VALUES(incoterm),
//           email = VALUES(email),
//           custentity_gs_str_date = VALUES(custentity_gs_str_date),
//           category = VALUES(category),
//           externalid = VALUES(externalid),
//           custentity_gs_pay_mth_ven = VALUES(custentity_gs_pay_mth_ven),
//           EFT = VALUES(EFT),
//           address1_defaultShipping = VALUES(address1_defaultShipping),
//           address1_defaultBilling = VALUES(address1_defaultBilling),
//           Legalname = VALUES(Legalname),
//           is1099Eligible = VALUES(is1099Eligible),
//           isPerson = VALUES(isPerson),
//           subsidiary = VALUES(subsidiary)
//       `;
//       await connection.query(transformQuery);

//       // Get existing records to compare for deletion
//       const [existingRecords] = await connection.query('SELECT custentity_gs_vendor_number FROM fournisseurgenius');
//       const existingIds = new Set(existingRecords.map(row => row.custentity_gs_vendor_number));
//       const newIds = new Set(geniusData.map(row => row.F_No));

//       // Delete records that no longer exist in source
//       const idsToDelete = [...existingIds].filter(id => !newIds.has(id));
//       if (idsToDelete.length > 0) {
//         await connection.query('DELETE FROM fournisseurgenius WHERE custentity_gs_vendor_number IN (?)', [idsToDelete]);
//       }

//       connection.release();
//       return {
//         success: true,
//         message: `Synchronization completed: ${tempValues.length} processed, ${idsToDelete.length} deleted`
//       };
//     } catch (error) {
//       throw new Error(`Failed to sync data: ${error.message}`);
//     }
//   },

//   // Drop the table
//   async dropTable() {
//     try {
//       const connection = await pool.getConnection();
//       await connection.query('DROP TABLE IF EXISTS fournisseurgenius');
//       await connection.query('DROP TABLE IF EXISTS temp_fournisseur_genius');
//       connection.release();
//       return { success: true, message: 'Tables dropped successfully' };
//     } catch (error) {
//       throw new Error(`Failed to drop tables: ${error.message}`);
//     }
//   }
// };

// module.exports = fournisseurModel;
const pool = require('../config/mysqlConfig');
const { connectODBC } = require('../config/odbcConfig');
const { stringify } = require('csv-stringify');
const iconv = require('iconv-lite');

// Helper function to convert from binary to UTF-8
const convertToUTF8 = (value) => {
  if (value == null) return '';
  if (typeof value !== 'string') value = value.toString();
  const rawBuffer = Buffer.from(value, 'binary');
  console.log(`Raw value: ${value} (HEX: ${rawBuffer.toString('hex')})`);
  return value; // Return as-is; we'll fix exceptions manually
};

// Helper function to fix specific special character exceptions
const fixSpecialCharacterExceptions = (value) => {
  if (typeof value !== 'string') return value;

  let corrected = value
    .replace(/KILOTECH CONTR�LE INC/g, 'KILOTECH CONTRÔLE INC')
    .replace(/6750 Saint-Fran�ois/g, '6750 Saint-François')
    .replace(/Marc-Andr�/g, 'Marc-André')
    .replace(/No�l/g, 'Noël')
    .replace(/B�LANGER/g, 'BÉLANGER')
    .replace(/Marie-�ve/g, 'Marie-Ève')
    .replace(/Rh�anne/g, 'Rhéanne')
    .replace(/MONTR�AL/g, 'MONTRÉAL')
    .replace(/�TALFORT/g, 'ÉTALFORT')
    .replace(/6117 RUE DE L'�GLISE/g, "6117 RUE DE L'ÉGLISE")
    .replace(/550 MONT�E DE LIESSE/g, '550 MONTÉE DE LIESSE')
    .replace(/2223, DE LA M�TROPOLE/g, '2223, DE LA MÉTROPOLE')
    .replace(/�TIQUETTES RIVE-SUD/g, 'ÉTIQUETTES RIVE-SUD')
    .replace(/LES CL�TURES ARBOIT INC./g, 'LES CLÔTURES ARBOIT INC.')
    .replace(/\uFFFD/g, 'É');

  if (corrected !== value) {
    console.log(`Corrected: ${value} → ${corrected} (HEX: ${Buffer.from(corrected).toString('hex')})`);
  }
  return corrected;
};

// Helper function to validate PaymentModeId
const validatePaymentModeId = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  if (Number.isInteger(value)) return value;
  console.warn(`Invalid PaymentModeId value: ${value} (type: ${typeof value})`);
  return null;
};

// Helper function to validate date
const validateDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date format: ${dateStr}`);
    return null;
  }
  const formattedDate = dateStr.split(' ')[0]; // Extract YYYY-MM-DD part
  console.log(`Formatted date: ${dateStr} → ${formattedDate}`);
  return formattedDate;
};

// Helper function to validate and extract email
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    console.log(`No email: email field is empty or invalid: ${email}`);
    return '';
  }
  // Match emails in formats like <user@domain.com> or user@domain.com
  const emailMatch = email.match(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    const extractedEmail = emailMatch[1] || emailMatch[2];
    console.log(`Extracted email: ${email} → ${extractedEmail}`);
    return extractedEmail;
  }
  console.log(`No valid email found in email field: ${email}`);
  return '';
};

// Helper function to parse contact
const parseContact = (contact) => {
  let firstName = '', middleName = '', lastName = '';
  if (!contact || typeof contact !== 'string' || contact.toLowerCase().includes('online buy')) {
    return { firstName, middleName, lastName };
  }
  const emailMatch = contact.match(/<(.+@.+)>/);
  let namePart = emailMatch ? contact.split('<')[0].trim() : contact.trim();
  if (emailMatch && !namePart) {
    const emailName = emailMatch[1].split('@')[0];
    const emailParts = emailName.split(/[_.-]/);
    if (emailParts.length >= 2) {
      firstName = emailParts[0];
      lastName = emailParts.slice(1).join('');
    } else {
      lastName = emailName;
    }
  } else if (!emailMatch && contact.includes('@')) {
    const emailParts = contact.split('@')[0].split(/[_.-]/);
    if (emailParts.length >= 2) {
      firstName = emailParts[0];
      lastName = emailParts.slice(1).join('');
    } else {
      lastName = emailParts[0];
    }
  } else {
    namePart = namePart.replace(/[,\/].*$/, '').trim();
    const parts = namePart.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      firstName = parts[0];
    } else if (parts.length === 2) {
      if (parts[0].includes('-')) {
        firstName = parts[0];
        lastName = parts[1];
      } else if (parts[1].includes('-')) {
        firstName = parts[0];
        lastName = parts[1];
      } else {
        firstName = parts[0];
        lastName = parts[1];
      }
    } else if (parts.length >= 3) {
      if (parts[1].includes('-')) {
        firstName = parts[0];
        lastName = `${parts[1]} ${parts[2]}`;
      } else {
        firstName = parts[0];
        middleName = parts.slice(1, -1).join(' ');
        lastName = parts[parts.length - 1];
      }
    }
  }
  return { firstName, middleName, lastName };
};

const fournisseurModel = {
  async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS fournisseurgenius (
        custentity_gs_vendor_number VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
        vendorId VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        companyName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        printOnCheckAs VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_line1 VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_line2 VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_city VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_state VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_countrys VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_zipCode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        phone VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        fax VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        First VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Middle VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Last VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        terms VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        currency VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentity_gs_ship_mth VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        language VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        incoterm VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentity_gs_str_date DATE,
        category VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        externalid VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentity_gs_pay_mth_ven VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        EFT CHAR(1),
        address1_defaultShipping CHAR(1),
        address1_defaultBilling CHAR(1),
        Legalname VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        is1099Eligible CHAR(1),
        isPerson CHAR(1),
        subsidiary VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        isInactive CHAR(1),
        emailTransactions CHAR(1),
        faxTransactions CHAR(1),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`;
    try {
      const connection = await pool.getConnection();
      await connection.query(createTableQuery);

      // Check and add new columns if they don't exist
      const [columns] = await connection.query("SHOW COLUMNS FROM fournisseurgenius");
      const columnNames = columns.map(col => col.Field);

      if (!columnNames.includes('isInactive')) {
        await connection.query("ALTER TABLE fournisseurgenius ADD isInactive CHAR(1) DEFAULT 'F'");
        console.log("Added isInactive column to fournisseurgenius");
      }
      if (!columnNames.includes('emailTransactions')) {
        await connection.query("ALTER TABLE fournisseurgenius ADD emailTransactions CHAR(1) DEFAULT 'F'");
        console.log("Added emailTransactions column to fournisseurgenius");
      }
      if (!columnNames.includes('faxTransactions')) {
        await connection.query("ALTER TABLE fournisseurgenius ADD faxTransactions CHAR(1) DEFAULT 'F'");
        console.log("Added faxTransactions column to fournisseurgenius");
      }

      connection.release();
      return { success: true, message: 'Table fournisseurgenius created or updated successfully' };
    } catch (error) {
      console.error(`Error creating or updating table: ${error.message}`);
      throw new Error(`Failed to create or update table: ${error.message}`);
    }
  },

  async createTempTable() {
    const createTempTableQuery = `
      CREATE TABLE IF NOT EXISTS temp_fournisseur_genius (
        F_No VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Nom VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        CheckName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Adresse VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        VDS_Address2 VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Ville VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Pays VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Province VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Codepostal VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Telephone VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Fax VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        contact VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Termeach VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Devise VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Transport VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        langue VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Modeexp VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        datecree DATE,
        Classification VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        vds_link VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        PaymentModeId INT,
        First VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Middle VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Last VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`;
    try {
      const connection = await pool.getConnection();
      await connection.query(createTempTableQuery);

      // Check and add email column if it doesn't exist
      const [columns] = await connection.query("SHOW COLUMNS FROM temp_fournisseur_genius");
      const columnNames = columns.map(col => col.Field);

      if (!columnNames.includes('email')) {
        await connection.query("ALTER TABLE temp_fournisseur_genius ADD email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
        console.log("Added email column to temp_fournisseur_genius");
      }

      connection.release();
      return { success: true, message: 'Temporary table created or updated successfully' };
    } catch (error) {
      console.error(`Error creating or updating temporary table: ${error.message}`);
      throw new Error(`Failed to create or update temporary table: ${error.message}`);
    }
  },

  async fetchGeniusData() {
    const geniusQuery = `
      SELECT 
        F_No,
        Nom,
        CheckName,
        Adresse,
        VDS_Address2,
        Ville,
        Pays,
        Province,
        Codepostal,
        Telephone,
        Fax,
        contact,
        Termeach,
        Devise,
        Transport,
        langue,
        Modeexp,
        datecree,
        Classification,
        vds_link,
        PaymentModeId,
        Email
      FROM Fou
      WHERE 
        Actif = 'O' 
        AND F_no = VDS_PaidToVendorLink 
        AND (Pays = 'CANADA' OR Pays = 'USA')
        AND Adresse <> ''
        AND F_NO NOT LIKE '%-%'
        AND Modeexp NOT IN ('PPC', 'COD', 'COLLECT')
    `;
    try {
      const connection = await connectODBC();
      const result = await connection.query(geniusQuery);
      await connection.close();
      const cleanedData = result.map((row) => {
        Object.keys(row).forEach((key) => {
          console.log(`Processing field ${key} for F_No ${row.F_No}`);
          row[key] = convertToUTF8(row[key]);
          row[key] = fixSpecialCharacterExceptions(row[key]);
        });

        row.PaymentModeId = validatePaymentModeId(row.PaymentModeId);
        row.datecree = validateDate(row.datecree);
        row.email = validateEmail(row.Email);
        const { firstName, middleName, lastName } = parseContact(row.contact);
        console.log(`Processed data for F_No ${row.F_No}: contact=${row.contact}, email=${row.email}, First=${firstName}, Middle=${middleName}, Last=${lastName}`);
        return { ...row, First: firstName, Middle: middleName, Last: lastName, email: row.email };
      });
      return cleanedData;
    } catch (error) {
      console.error(`Error fetching Genius data: ${error.message}`);
      throw new Error(`Failed to fetch data from Genius: ${error.message}`);
    }
  },

  async syncData() {
    try {
      await this.createTable();
      await this.createTempTable();

      const geniusData = await this.fetchGeniusData();
      const connection = await pool.getConnection();
      await connection.query('SET SESSION character_set_client = utf8mb4');
      await connection.query('SET SESSION character_set_results = utf8mb4');
      await connection.query('SET SESSION character_set_connection = utf8mb4');
      await connection.query('TRUNCATE TABLE temp_fournisseur_genius');
      const insertTempQuery = `
        INSERT INTO temp_fournisseur_genius (
          F_No, Nom, CheckName, Adresse, VDS_Address2, Ville, Pays, Province, Codepostal,
          Telephone, Fax, contact, Termeach, Devise, Transport, langue, Modeexp, datecree,
          Classification, vds_link, PaymentModeId, First, Middle, Last, email
        ) VALUES ?
      `;
      const tempValues = geniusData.map(row => [
        row.F_No, row.Nom, row.CheckName, row.Adresse, row.VDS_Address2, row.Ville,
        row.Pays, row.Province, row.Codepostal, row.Telephone, row.Fax, row.contact,
        row.Termeach, row.Devise, row.Transport, row.langue, row.Modeexp, row.datecree,
        row.Classification, row.vds_link, row.PaymentModeId, row.First, row.Middle, row.Last, row.email
      ]);
      if (tempValues.length > 0) {
        await connection.query(insertTempQuery, [tempValues]);
      }

      // Log sample data from temp_fournisseur_genius
      const [tempRows] = await connection.query('SELECT F_No, datecree, email, contact FROM temp_fournisseur_genius LIMIT 5');
      console.log('Sample data from temp_fournisseur_genius:', tempRows);

      const transformQuery = `
        INSERT INTO fournisseurgenius (
          custentity_gs_vendor_number, vendorId, companyName, printOnCheckAs, address1_line1, address1_line2,
          address1_city, address1_state, address1_countrys, address1_zipCode, phone, fax, First, Middle, Last,
          terms, currency, custentity_gs_ship_mth, language, incoterm, email, custentity_gs_str_date, category,
          externalid, custentity_gs_pay_mth_ven, EFT, address1_defaultShipping, address1_defaultBilling,
          Legalname, is1099Eligible, isPerson, subsidiary, isInactive, emailTransactions, faxTransactions
        )
        SELECT 
          Fou.F_No AS custentity_gs_vendor_number,
          Fou.Nom AS vendorId,
          Fou.Nom AS companyName,
          Fou.CheckName AS printOnCheckAs,
          Fou.Adresse AS address1_line1,
          Fou.VDS_Address2 AS address1_line2,
          Fou.Ville AS address1_city,
          ppm.provincenetsuite AS address1_state,
          ppm.paysnetsuite AS address1_countrys,
          Fou.Codepostal AS address1_zipCode,
          Fou.Telephone AS phone,
          Fou.Fax AS fax,
          Fou.First,
          Fou.Middle,
          Fou.Last,
          tm.terms_netsuite AS terms,
          cm.currency_netsuite AS currency,
          tpm.netsuite_transport AS custentity_gs_ship_mth,
          CASE
            WHEN Fou.langue = 'FRENCH' THEN 'French (Canada)'
            WHEN Fou.langue = 'ENGLISH' THEN 'English (US)'
            ELSE ''
          END AS language,
          incom.incoterm_netsuite AS incoterm,
          Fou.email AS email,
          CAST(Fou.datecree AS DATE) AS custentity_gs_str_date,
          catm.netsuitecategory AS category,
          Fou.vds_link AS externalid,
          modepm.internal_id_netsuite AS custentity_gs_pay_mth_ven,
          CASE WHEN Fou.PaymentModeId = 2 THEN 'T' ELSE 'F' END AS EFT,
          'T' AS address1_defaultShipping,
          'T' AS address1_defaultBilling,
          '' AS Legalname,
          'F' AS is1099Eligible,
          'F' AS isPerson,
          '2' AS subsidiary,
          'F' AS isInactive,
          'F' AS emailTransactions,
          'F' AS faxTransactions
        FROM temp_fournisseur_genius Fou
        LEFT JOIN terms_mapping tm ON Fou.Termeach COLLATE utf8mb4_0900_ai_ci = tm.terms_genius 
        LEFT JOIN currency_mapping cm ON Fou.Devise COLLATE utf8mb4_0900_ai_ci = cm.currency_genius
        LEFT JOIN transport_mapping tpm ON Fou.Transport COLLATE utf8mb4_0900_ai_ci = tpm.genius_transport 
        LEFT JOIN incoterm_mapping incom ON Fou.Modeexp COLLATE utf8mb4_0900_ai_ci = incom.incoterm_genius 
        LEFT JOIN modepaiement_mapping modepm ON Fou.PaymentModeId = modepm.id_genuis 
        LEFT JOIN pays_province_mapping ppm ON Fou.Pays = ppm.paysgenius AND Fou.Province = ppm.provincegenius 
        LEFT JOIN category_mapping catm ON Fou.Classification COLLATE utf8mb4_0900_ai_ci = catm.geniuscategory
        ON DUPLICATE KEY UPDATE
          vendorId = VALUES(vendorId),
          companyName = VALUES(companyName),
          printOnCheckAs = VALUES(printOnCheckAs),
          address1_line1 = VALUES(address1_line1),
          address1_line2 = VALUES(address1_line2),
          address1_city = VALUES(address1_city),
          address1_state = VALUES(address1_state),
          address1_countrys = VALUES(address1_countrys),
          address1_zipCode = VALUES(address1_zipCode),
          phone = VALUES(phone),
          fax = VALUES(fax),
          First = VALUES(First),
          Middle = VALUES(Middle),
          Last = VALUES(Last),
          terms = VALUES(terms),
          currency = VALUES(currency),
          custentity_gs_ship_mth = VALUES(custentity_gs_ship_mth),
          language = VALUES(language),
          incoterm = VALUES(incoterm),
          email = VALUES(email),
          custentity_gs_str_date = VALUES(custentity_gs_str_date),
          category = VALUES(category),
          externalid = VALUES(externalid),
          custentity_gs_pay_mth_ven = VALUES(custentity_gs_pay_mth_ven),
          EFT = VALUES(EFT),
          address1_defaultShipping = VALUES(address1_defaultShipping),
          address1_defaultBilling = VALUES(address1_defaultBilling),
          Legalname = VALUES(Legalname),
          is1099Eligible = VALUES(is1099Eligible),
          isPerson = VALUES(isPerson),
          subsidiary = VALUES(subsidiary),
          isInactive = VALUES(isInactive),
          emailTransactions = VALUES(emailTransactions),
          faxTransactions = VALUES(faxTransactions)
      `;
      await connection.query(transformQuery);

      // Log sample data from fournisseurgenius
      const [transformedSample] = await connection.query(`
        SELECT custentity_gs_vendor_number, custentity_gs_str_date, email, subsidiary, isInactive, emailTransactions, faxTransactions
        FROM fournisseurgenius LIMIT 5
      `);
      console.log('Sample data from fournisseurgenius:', transformedSample);

      // Fetch the transformed data from fournisseurgenius with formatted date
      const [transformedData] = await connection.query(`
        SELECT 
          custentity_gs_vendor_number,
          vendorId,
          companyName,
          printOnCheckAs,
          address1_line1,
          address1_line2,
          address1_city,
          address1_state,
          address1_countrys,
          address1_zipCode,
          phone,
          fax,
          First,
          Middle,
          Last,
          terms,
          currency,
          custentity_gs_ship_mth,
          language,
          incoterm,
          email,
          DATE_FORMAT(custentity_gs_str_date, '%Y-%m-%d') AS custentity_gs_str_date,
          category,
          externalid,
          custentity_gs_pay_mth_ven,
          EFT,
          address1_defaultShipping,
          address1_defaultBilling,
          Legalname,
          is1099Eligible,
          isPerson,
          subsidiary,
          isInactive,
          emailTransactions,
          faxTransactions,
          last_updated
        FROM fournisseurgenius
      `);

      const [existingRecords] = await connection.query('SELECT custentity_gs_vendor_number FROM fournisseurgenius');
      const existingIds = new Set(existingRecords.map(row => row.custentity_gs_vendor_number));
      const newIds = new Set(geniusData.map(row => row.F_No));

      const idsToDelete = [...existingIds].filter(id => !newIds.has(id));
      if (idsToDelete.length > 0) {
        await connection.query('DELETE FROM fournisseurgenius WHERE custentity_gs_vendor_number IN (?)', [idsToDelete]);
      }

      connection.release();
      return {
        success: true,
        message: `Synchronization completed: ${tempValues.length} processed, ${idsToDelete.length} deleted`,
        data: transformedData
      };
    } catch (error) {
      console.error(`Error in syncData: ${error.message}`);
      throw new Error(`Failed to sync data: ${error.message}`);
    }
  },

  async downloadCSV() {
    try {
      const connection = await pool.getConnection();
      await connection.query('SET SESSION character_set_client = utf8mb4');
      await connection.query('SET SESSION character_set_results = utf8mb4');
      await connection.query('SET SESSION character_set_connection = utf8mb4');
      const [rows] = await connection.query(`
        SELECT 
          custentity_gs_vendor_number,
          vendorId,
          companyName,
          printOnCheckAs,
          address1_line1,
          address1_line2,
          address1_city,
          address1_state,
          address1_countrys,
          address1_zipCode,
          phone,
          fax,
          First,
          Middle,
          Last,
          terms,
          currency,
          custentity_gs_ship_mth,
          language,
          incoterm,
          email,
          DATE_FORMAT(custentity_gs_str_date, '%Y-%m-%d') AS custentity_gs_str_date,
          category,
          externalid,
          custentity_gs_pay_mth_ven,
          EFT,
          address1_defaultShipping,
          address1_defaultBilling,
          Legalname,
          is1099Eligible,
          isPerson,
          subsidiary,
          isInactive,
          emailTransactions,
          faxTransactions,
          last_updated
        FROM fournisseurgenius
      `);
      connection.release();

      const columns = [
        'custentity_gs_vendor_number', 'vendorId', 'companyName', 'printOnCheckAs', 'address1_line1',
        'address1_line2', 'address1_city', 'address1_state', 'address1_countrys', 'address1_zipCode',
        'phone', 'fax', 'First', 'Middle', 'Last', 'terms', 'currency', 'custentity_gs_ship_mth',
        'language', 'incoterm', 'email', 'custentity_gs_str_date', 'category', 'externalid',
        'custentity_gs_pay_mth_ven', 'EFT', 'address1_defaultShipping', 'address1_defaultBilling',
        'Legalname', 'is1099Eligible', 'isPerson', 'subsidiary', 'isInactive', 'emailTransactions',
        'faxTransactions', 'last_updated'
      ];

      return new Promise((resolve, reject) => {
        const bom = '\uFEFF';
        stringify(rows, {
          header: true,
          columns: columns,
        }, (err, output) => {
          if (err) return reject(new Error(`Failed to generate CSV: ${err.message}`));
          const csvWithBom = bom + output;
          resolve(csvWithBom);
        });
      });
    } catch (error) {
      console.error(`Error in downloadCSV: ${error.message}`);
      throw new Error(`Failed to download CSV: ${error.message}`);
    }
  },

  async dropTable() {
    try {
      const connection = await pool.getConnection();
      await connection.query('DROP TABLE IF EXISTS fournisseurgenius');
      await connection.query('DROP TABLE IF EXISTS temp_fournisseur_genius');
      connection.release();
      return { success: true, message: 'Tables dropped successfully' };
    } catch (error) {
      console.error(`Error dropping tables: ${error.message}`);
      throw new Error(`Failed to drop tables: ${error.message}`);
    }
  }
};

module.exports = fournisseurModel;

// printOnCheckAs VERFIER LE DONNÉ lancienne version si besoin. CASE WHEN Fou.CheckName = Fou.Nom THEN '' ELSE Fou.CheckName END AS printOnCheckAs,

//verifier le email
//custentity_gs_str_date case date
// isInactive F
// emailTransactions F
// faxTransactions F

