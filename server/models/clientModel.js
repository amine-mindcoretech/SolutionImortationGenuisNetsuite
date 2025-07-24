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
  return value; // Return as-is; we'll fix exceptions manually with fallback
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

const clientModel = {
  async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS clientgenius_import (
        entityid VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        companyName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_line1 VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_line2 VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_city VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_state VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_countrys VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_zipCode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        address1_phone VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        fax VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        firstName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        middleName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        lastName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        terms VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        currency VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentitycustentity_mc_transport VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        language VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentity_mc_incoterm_client VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        startdate DATE,
        category VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        externalid VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
        custentity_gs_pay_mth VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        EFT CHAR(1),
        address1_defaultShipping CHAR(1),
        address1_defaultBilling CHAR(1),
        Legalname VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        is1099Eligible CHAR(1),
        isPerson CHAR(1),
        subsidiary VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentity_mct_terri_vente VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        salesrep VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        comments VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        taxitem VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentity_mc_notecom VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentity_mc_noteexp VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        custentity_mc_notefac VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        isInactive CHAR(1),
        emailTransactions CHAR(1),
        faxTransactions CHAR(1),
        status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        numberformat VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`;
    try {
      const connection = await pool.getConnection();
      await connection.query(createTableQuery);

      // Check and add new columns if they don't exist
      const [columns] = await connection.query("SHOW COLUMNS FROM clientgenius_import");
      const columnNames = columns.map(col => col.Field);

      if (!columnNames.includes('isInactive')) {
        await connection.query("ALTER TABLE clientgenius_import ADD isInactive CHAR(1) DEFAULT 'F'");
        console.log("Added isInactive column to clientgenius_import");
      }
      if (!columnNames.includes('emailTransactions')) {
        await connection.query("ALTER TABLE clientgenius_import ADD emailTransactions CHAR(1) DEFAULT 'F'");
        console.log("Added emailTransactions column to clientgenius_import");
      }
      if (!columnNames.includes('faxTransactions')) {
        await connection.query("ALTER TABLE clientgenius_import ADD faxTransactions CHAR(1) DEFAULT 'F'");
        console.log("Added faxTransactions column to clientgenius_import");
      }
      if (!columnNames.includes('status')) {
        await connection.query("ALTER TABLE clientgenius_import ADD status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CUSTOMER-Actif'");
        console.log("Added status column to clientgenius_import");
      }
      if (!columnNames.includes('numberformat')) {
        await connection.query("ALTER TABLE clientgenius_import ADD numberformat VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '1 000 000,00'");
        console.log("Added numberformat column to clientgenius_import");
      }

      connection.release();
      return { success: true, message: 'Table clientgenius_import created or updated successfully' };
    } catch (error) {
      console.error(`Error creating or updating table: ${error.message}`);
      throw new Error(`Failed to create or update table: ${error.message}`);
    }
  },

  async createTempTable() {
    const createTempTableQuery = `
      CREATE TABLE temp_client_genius (
        C_No VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Nom VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Adresse VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        CTR_Address2 VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Ville VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Pays VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Province VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Codepostal VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Telephone VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Fax VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        contact VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Term VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Devise VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Transport VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        langue VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Modeexp VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        datecree DATE,
        Classe VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        CTR_Link VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        PaymentModeID INT,
        Terri VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Vendor VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Watt VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Groupe VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Notecom VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Noteexp VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        Notefac VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        firstName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        middleName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        lastName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
        email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`;
    try {
      const connection = await pool.getConnection();
      await connection.query('DROP TABLE IF EXISTS temp_client_genius');
      await connection.query(createTempTableQuery);
      connection.release();
      return { success: true, message: 'Temporary table created successfully' };
    } catch (error) {
      console.error(`Error creating temporary table: ${error.message}`);
      throw new Error(`Failed to create temporary table: ${error.message}`);
    }
  },

  async fetchGeniusData() {
    const geniusQuery = `
      SELECT 
        C_No,
        Nom,
        Adresse,
        CTR_Address2,
        Ville,
        Pays,
        Province,
        Codepostal,
        Telephone,
        Fax,
        contact,
        Term,
        Devise,
        Transport,
        langue,
        Modeexp,
        datecree,
        Classe,
        CTR_Link,
        PaymentModeID,
        Terri,
        Vendor,
        Watt,
        Groupe,
        Notecom,
        Noteexp,
        Notefac,
        Email
      FROM Cli
      WHERE 
        Actif = 'O' 
        AND IsNationalAccount = 0
        AND Fac_A = C_No
        AND (Pays = 'CANADA' OR Pays = 'USA')
        AND Adresse <> ''
        AND Modeexp NOT IN ('PPC', 'COD', 'COLLECT')
    `;
    try {
      const connection = await connectODBC();
      console.log('Executing Genius query:', geniusQuery);
      const result = await connection.query(geniusQuery);
      console.log(`Raw data fetched: ${result.length} rows`);
      await connection.close();

      const cleanedData = result.map((row, index) => {
        Object.keys(row).forEach((key) => {
          console.log(`Processing field ${key} for C_No ${row.C_No || 'Unknown'}`);
          row[key] = convertToUTF8(row[key]);
          row[key] = fixSpecialCharacterExceptions(row[key]);
        });

        // Truncate Nom to prevent data too long error, with warning
        if (row.Nom && row.Nom.length > 512) {
          console.warn(`Row ${index + 1}: Nom truncated from ${row.Nom.length} to 512 characters`);
          row.Nom = row.Nom.substring(0, 512);
        }

        // Handle empty or null Nom values
        if (!row.Nom) {
          console.warn(`Row ${index + 1}: Nom is empty or null, using C_No as fallback`);
          row.Nom = row.C_No || `Unknown_${index}`;
        }

        row.PaymentModeID = validatePaymentModeId(row.PaymentModeID);
        row.datecree = validateDate(row.datecree);
        row.email = validateEmail(row.Email);
        const { firstName, middleName, lastName } = parseContact(row.contact);
        console.log(`Processed data for C_No ${row.C_No}: contact=${row.contact}, email=${row.email}, First=${firstName}, Middle=${middleName}, Last=${lastName}`);
        return { ...row, firstName, middleName, lastName, email: row.email };
      });
      console.log(`Cleaned data length: ${cleanedData.length} rows`);
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
      await connection.query('TRUNCATE TABLE temp_client_genius');
      const insertTempQuery = `
        INSERT INTO temp_client_genius (
          C_No, Nom, Adresse, CTR_Address2, Ville, Pays, Province, Codepostal,
          Telephone, Fax, contact, Term, Devise, Transport, langue, Modeexp, datecree,
          Classe, CTR_Link, PaymentModeID, Terri, Vendor, Watt, Groupe, Notecom,
          Noteexp, Notefac, firstName, middleName, lastName, email
        ) VALUES ?
      `;
      const tempValues = geniusData.map(row => [
        row.C_No, row.Nom, row.Adresse, row.CTR_Address2, row.Ville,
        row.Pays, row.Province, row.Codepostal, row.Telephone, row.Fax, row.contact,
        row.Term || '', row.Devise, row.Transport, row.langue, row.Modeexp, row.datecree,
        row.Classe, row.CTR_Link, row.PaymentModeID, row.Terri, row.Vendor,
        row.Watt, row.Groupe, row.Notecom, row.Noteexp, row.Notefac, row.firstName, row.middleName, row.lastName, row.email
      ]);
      console.log(`Inserting ${tempValues.length} rows into temp_client_genius`);
      if (tempValues.length > 0) {
        await connection.query(insertTempQuery, [tempValues]);
      }

      const transformQuery = `
        INSERT INTO clientgenius_import (
          entityid, companyName, address1_line1, address1_line2, address1_city, address1_state, address1_countrys, 
          address1_zipCode, address1_phone, fax, firstName, middleName, lastName, terms, currency, custentitycustentity_mc_transport, language, 
          custentity_mc_incoterm_client, email, startdate, category, externalid, custentity_gs_pay_mth, EFT, 
          address1_defaultShipping, address1_defaultBilling, Legalname, is1099Eligible, isPerson, subsidiary,
          custentity_mct_terri_vente, salesrep, comments, taxitem, custentity_mc_notecom, custentity_mc_noteexp, 
          custentity_mc_notefac, isInactive, emailTransactions, faxTransactions, status, numberformat
        )
        SELECT 
          Cli.Nom AS entityid,
          Cli.Nom AS companyName,
          Cli.Adresse AS address1_line1,
          Cli.CTR_Address2 AS address1_line2,
          Cli.Ville AS address1_city,
          ppm.provincenetsuite AS address1_state,
          ppm.paysnetsuite AS address1_countrys,
          Cli.Codepostal AS address1_zipCode,
          Cli.Telephone AS address1_phone,
          Cli.Fax AS fax,
          Cli.firstName,
          Cli.middleName,
          Cli.lastName,
          tm.terms_netsuite AS terms,
          cm.currency_netsuite AS currency,
          tpm.netsuite_transport AS custentitycustentity_mc_transport,
          CASE
            WHEN Cli.langue = 'FRENCH' THEN 'French (Canada)'
            WHEN Cli.langue = 'ENGLISH' THEN 'English (U.S.)'
            ELSE ''
          END AS language,
          incom.incoterm_netsuite AS custentity_mc_incoterm_client,
          Cli.email AS email,
          CAST(Cli.datecree AS DATE) AS startdate,
          Cli.Classe AS category,
          Cli.CTR_Link AS externalid,
          modepm.internal_id_netsuite AS custentity_gs_pay_mth,
          CASE WHEN Cli.PaymentModeID = 2 THEN 'T' ELSE 'F' END AS EFT,
          'T' AS address1_defaultShipping,
          'T' AS address1_defaultBilling,
          '' AS Legalname,
          'F' AS is1099Eligible,
          'F' AS isPerson,
          '2' AS subsidiary,
          tmv.netsuite_territoire AS custentity_mct_terri_vente,
          vm.netsuite_salerep AS salesrep,
          Cli.Watt AS comments,
          taxe.netsuite_code AS taxitem,
          Cli.Notecom AS custentity_mc_notecom,
          Cli.Noteexp AS custentity_mc_noteexp,
          Cli.Notefac AS custentity_mc_notefac,
          'F' AS isInactive,
          'F' AS emailTransactions,
          'F' AS faxTransactions,
          'CUSTOMER-Actif' AS status,
          '1 000 000,00' AS numberformat
        FROM temp_client_genius Cli
        LEFT JOIN terms_mapping tm ON Cli.Term COLLATE utf8mb4_0900_ai_ci = tm.terms_genius
        LEFT JOIN currency_mapping cm ON Cli.Devise COLLATE utf8mb4_0900_ai_ci = cm.currency_genius
        LEFT JOIN transport_mapping tpm ON Cli.Transport COLLATE utf8mb4_0900_ai_ci = tpm.genius_transport
        LEFT JOIN incoterm_mapping incom ON Cli.Modeexp COLLATE utf8mb4_0900_ai_ci = incom.incoterm_genius
        LEFT JOIN modepaiement_mapping modepm ON Cli.PaymentModeID = modepm.id_genuis
        LEFT JOIN pays_province_mapping ppm ON Cli.Pays = ppm.paysgenius AND Cli.Province = ppm.provincegenius
        LEFT JOIN territoireventes_mapping tmv ON LOWER(Cli.Terri) = LOWER(tmv.genius_ID)
        LEFT JOIN vendeur_mapping vm ON Cli.Vendor = vm.genius_salerep
        LEFT JOIN taxe_mapping taxe ON Cli.Groupe = taxe.genius_code
        ON DUPLICATE KEY UPDATE
          entityid = VALUES(entityid),
          companyName = VALUES(companyName),
          address1_line1 = VALUES(address1_line1),
          address1_line2 = VALUES(address1_line2),
          address1_city = VALUES(address1_city),
          address1_state = VALUES(address1_state),
          address1_countrys = VALUES(address1_countrys),
          address1_zipCode = VALUES(address1_zipCode),
          address1_phone = VALUES(address1_phone),
          fax = VALUES(fax),
          firstName = VALUES(firstName),
          middleName = VALUES(middleName),
          lastName = VALUES(lastName),
          terms = VALUES(terms),
          currency = VALUES(currency),
          custentitycustentity_mc_transport = VALUES(custentitycustentity_mc_transport),
          language = VALUES(language),
          custentity_mc_incoterm_client = VALUES(custentity_mc_incoterm_client),
          email = VALUES(email),
          startdate = VALUES(startdate),
          category = VALUES(category),
          externalid = VALUES(externalid),
          custentity_gs_pay_mth = VALUES(custentity_gs_pay_mth),
          EFT = VALUES(EFT),
          address1_defaultShipping = VALUES(address1_defaultShipping),
          address1_defaultBilling = VALUES(address1_defaultBilling),
          Legalname = VALUES(Legalname),
          is1099Eligible = VALUES(is1099Eligible),
          isPerson = VALUES(isPerson),
          subsidiary = VALUES(subsidiary),
          custentity_mct_terri_vente = VALUES(custentity_mct_terri_vente),
          salesrep = VALUES(salesrep),
          comments = VALUES(comments),
          taxitem = VALUES(taxitem),
          custentity_mc_notecom = VALUES(custentity_mc_notecom),
          custentity_mc_noteexp = VALUES(custentity_mc_noteexp),
          custentity_mc_notefac = VALUES(custentity_mc_notefac),
          isInactive = VALUES(isInactive),
          emailTransactions = VALUES(emailTransactions),
          faxTransactions = VALUES(faxTransactions),
          status = VALUES(status),
          numberformat = VALUES(numberformat)
      `;
      await connection.query(transformQuery);

      // Fetch the transformed data with formatted date
      const [transformedData] = await connection.query(`
        SELECT 
          entityid,
          companyName,
          address1_line1,
          address1_line2,
          address1_city,
          address1_state,
          address1_countrys,
          address1_zipCode,
          address1_phone,
          fax,
          firstName,
          middleName,
          lastName,
          terms,
          currency,
          custentitycustentity_mc_transport,
          language,
          custentity_mc_incoterm_client,
          email,
          DATE_FORMAT(startdate, '%Y-%m-%d') AS startdate,
          category,
          externalid,
          custentity_gs_pay_mth,
          EFT,
          address1_defaultShipping,
          address1_defaultBilling,
          Legalname,
          is1099Eligible,
          isPerson,
          subsidiary,
          custentity_mct_terri_vente,
          salesrep,
          comments,
          taxitem,
          custentity_mc_notecom,
          custentity_mc_noteexp,
          custentity_mc_notefac,
          isInactive,
          emailTransactions,
          faxTransactions,
          status,
          numberformat,
          last_updated
        FROM clientgenius_import
      `);

      const [existingRecords] = await connection.query('SELECT entityid FROM clientgenius_import');
      const existingIds = new Set(existingRecords.map(row => row.entityid));
      const newIds = new Set(geniusData.map(row => row.C_No)); // Use C_No as entityid

      const idsToDelete = [...existingIds].filter(id => !newIds.has(id));
      if (idsToDelete.length > 0) {
        await connection.query('DELETE FROM clientgenius_import WHERE entityid IN (?)', [idsToDelete]);
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
          entityid,
          companyName,
          address1_line1,
          address1_line2,
          address1_city,
          address1_state,
          address1_countrys,
          address1_zipCode,
          address1_phone,
          fax,
          firstName,
          middleName,
          lastName,
          terms,
          currency,
          custentitycustentity_mc_transport,
          language,
          custentity_mc_incoterm_client,
          email,
          DATE_FORMAT(startdate, '%Y-%m-%d') AS startdate,
          category,
          externalid,
          custentity_gs_pay_mth,
          EFT,
          address1_defaultShipping,
          address1_defaultBilling,
          Legalname,
          is1099Eligible,
          isPerson,
          subsidiary,
          custentity_mct_terri_vente,
          salesrep,
          comments,
          taxitem,
          custentity_mc_notecom,
          custentity_mc_noteexp,
          custentity_mc_notefac,
          isInactive,
          emailTransactions,
          faxTransactions,
          status,
          numberformat,
          last_updated
        FROM clientgenius_import
      `);
      connection.release();

      const columns = [
        'entityid', 'companyName', 'address1_line1', 'address1_line2', 'address1_city',
        'address1_state', 'address1_countrys', 'address1_zipCode', 'address1_phone', 'fax',
        'firstName', 'middleName', 'lastName', 'terms', 'currency', 'custentitycustentity_mc_transport',
        'language', 'custentity_mc_incoterm_client', 'email', 'startdate', 'category',
        'externalid', 'custentity_gs_pay_mth', 'EFT', 'address1_defaultShipping',
        'address1_defaultBilling', 'Legalname', 'is1099Eligible', 'isPerson', 'subsidiary',
        'custentity_mct_terri_vente', 'salesrep', 'comments', 'taxitem',
        'custentity_mc_notecom', 'custentity_mc_noteexp', 'custentity_mc_notefac',
        'isInactive', 'emailTransactions', 'faxTransactions', 'status', 'numberformat',
        'last_updated'
      ];

      return new Promise((resolve, reject) => {
        const bom = '\uFEFF';
        stringify(rows, {
          header: true,
          columns: columns,
          delimiter: '|'
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
      await connection.query('DROP TABLE IF EXISTS clientgenius_import');
      await connection.query('DROP TABLE IF EXISTS temp_client_genius');
      connection.release();
      return { success: true, message: 'Tables dropped successfully' };
    } catch (error) {
      console.error(`Error dropping tables: ${error.message}`);
      throw new Error(`Failed to drop tables: ${error.message}`);
    }
  }
};

module.exports = clientModel;