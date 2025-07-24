//genuiscontroller.js
const { connectODBC } = require('../config/odbcConfig');
const { convertToUTF8, cleanInvalidChars } = require('../utils/utils');

const getClients = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();
        const result = await connection.query("SELECT * FROM Cli WHERE actif = 'O' AND Fac_A = C_No AND IsNationalAccount = 0");

        const cleanedData = result.map((row) => {
            Object.keys(row).forEach((key) => {
                let convertedValue = convertToUTF8(row[key]);
                row[key] = cleanInvalidChars(convertedValue);
            });
            return row;
        });

        res.json(cleanedData);
    } catch (error) {
        console.error('Erreur API Clients:', error);
        res.status(500).json({ error: 'Erreur de connexion à ODBC' });
    } finally {
        if (connection) await connection.close();
    }
};

const getContacts = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();
        const result = await connection.query("SELECT * FROM Cli WHERE actif = 'O' AND Fac_A <> C_No AND IsNationalAccount = 0");

        const cleanedData = result.map((row) => {
            Object.keys(row).forEach((key) => {
                let convertedValue = convertToUTF8(row[key]);
                row[key] = cleanInvalidChars(convertedValue);
            });
            return row;
        });

        res.json(cleanedData);
    } catch (error) {
        console.error('Erreur API Contacts:', error);
        res.status(500).json({ error: 'Erreur de connexion à ODBC' });
    } finally {
        if (connection) await connection.close();
    }
};
const getDatabaseSchema = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();

        // Dynamically import p-limit
        const { default: pLimit } = await import('p-limit');
        const limit = pLimit(5); // Limit concurrent queries

        // Fetch all table names
        const tablesResult = await connection.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);

        const schemaDetails = await Promise.all(
            tablesResult.map((table) =>
                limit(async () => {
                    const tableName = table.TABLE_NAME;
                    try {
                        const columnsResult = await connection.query(`
                            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
                            FROM INFORMATION_SCHEMA.COLUMNS
                            WHERE TABLE_NAME = '${tableName}'
                        `);

                        return { tableName, columns: columnsResult };
                    } catch (err) {
                        console.error(`Error fetching columns for table ${tableName}:`, err.message);
                        return { tableName, error: err.message };
                    }
                })
            )
        );

        res.json(schemaDetails);
    } catch (error) {
        console.error('Error fetching database schema:', error);
        res.status(500).json({ error: 'Erreur de connexion à ODBC', details: error.message });
    } finally {
        if (connection) await connection.close();
    }
};


const getTablesWithRecords = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();

        // Récupérer les noms des tables
        const tablesResult = await connection.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);

        // Vérifier les enregistrements pour chaque table
        const tablesWithRecords = [];
        for (const table of tablesResult) {
            const tableName = table.TABLE_NAME;
            try {
                const countResult = await connection.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
                if (countResult[0].count > 0) {
                    tablesWithRecords.push({
                        tableName,
                        recordCount: countResult[0].count,
                    });
                }
            } catch (err) {
                console.error(`Erreur lors de la vérification des enregistrements pour la table ${tableName}:`, err.message);
            }
        }

        res.json(tablesWithRecords);
    } catch (error) {
        console.error('Erreur lors de la récupération des tables avec enregistrements:', error.message);
        res.status(500).json({ error: 'Erreur de connexion à ODBC', details: error.message });
    } finally {
        if (connection) await connection.close();
    }
};



const getTablesWithMoreThan100Records = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();

        // Récupérer les noms des tables
        const tablesResult = await connection.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);

        // Vérifier les enregistrements pour chaque table
        const tablesWithRecords = [];
        const MIN_RECORD_COUNT = 100;

        for (const table of tablesResult) {
            const tableName = table.TABLE_NAME;
            try {
                const countResult = await connection.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
                const recordCount = countResult[0].count;

                if (recordCount >= MIN_RECORD_COUNT) {
                    tablesWithRecords.push({
                        tableName,
                        recordCount,
                    });
                }
            } catch (err) {
                console.error(`Erreur lors de la vérification des enregistrements pour la table ${tableName}:`, err.message);
            }
        }

        // Construire le résultat JSON
        const result = {
            totalTablesWithRecords: tablesWithRecords.length,
            tables: tablesWithRecords,
        };

        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la récupération des tables avec enregistrements:', error.message);
        res.status(500).json({ error: 'Erreur de connexion à ODBC', details: error.message });
    } finally {
        if (connection) await connection.close();
    }
};


const getTablesWithMoreThan100RecordsWithRelations = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();

        // Récupérer les noms des tables
        const tablesResult = await connection.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);

        const tablesWithRecords = [];
        const MIN_RECORD_COUNT = 100;

        for (const table of tablesResult) {
            const tableName = table.TABLE_NAME;
            try {
                const countResult = await connection.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
                const recordCount = countResult[0].count;

                if (recordCount >= MIN_RECORD_COUNT) {
                    // Récupérer les relations pour cette table
                    const relationsResult = await connection.query(`
                        SELECT *
                            KCU.TABLE_NAME AS sourceTable,
                            KCU.COLUMN_NAME AS sourceColumn,
                            KCU.REFERENCED_TABLE_NAME AS targetTable,
                            KCU.REFERENCED_COLUMN_NAME AS targetColumn
                        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU
                        WHERE KCU.TABLE_NAME = '${tableName}'
                        AND KCU.REFERENCED_TABLE_NAME IS NOT NULL
                    `);

                    tablesWithRecords.push({
                        tableName,
                        recordCount,
                        relations: relationsResult || [],
                    });
                }
            } catch (err) {
                console.error(`Erreur lors de la vérification des enregistrements pour la table ${tableName}:`, err.message);
            }
        }

        res.json(tablesWithRecords);
    } catch (error) {
        console.error('Erreur lors de la récupération des tables avec enregistrements:', error.message);
        res.status(500).json({ error: 'Erreur de connexion à ODBC', details: error.message });
    } finally {
        if (connection) await connection.close();
    }
};
// Récupérer tous les fournisseurs
const getSuppliers = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();
        const result = await connection.query(`
            SELECT * 
            FROM Fou 
            WHERE Actif = 'O' 
            AND F_no = VDS_PaidToVendorLink
            AND (pays = 'CANADA' OR pays = 'USA')
            AND Adresse <> ''
            AND F_no NOT LIKE '%-%'
            AND Modeexp NOT IN ('COD', 'COLLECT', 'PPC', 'FCA_FACTORY')
        `);

        const cleanedData = result.map((row) => {
            Object.keys(row).forEach((key) => {
                let convertedValue = convertToUTF8(row[key]);
                row[key] = cleanInvalidChars(convertedValue);
            });
            return row;
        });

        res.json(cleanedData);
    } catch (error) {
        console.error('Erreur API Fournisseurs:', error);
        res.status(500).json({ error: 'Erreur de connexion à ODBC' });
    } finally {
        if (connection) await connection.close();
    }
};

// Récupérer pays et provinces groupés
const getSuppliersCountriesProvinces = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();
        const result = await connection.query(`
            SELECT pays, province 
            FROM Fou 
            WHERE Actif = 'O' 
            AND F_no = VDS_PaidToVendorLink 
            GROUP BY pays, province
        `);

        const cleanedData = result.map((row) => {
            Object.keys(row).forEach((key) => {
                let convertedValue = convertToUTF8(row[key]);
                row[key] = cleanInvalidChars(convertedValue);
            });
            return row;
        });

        res.json(cleanedData);
    } catch (error) {
        console.error('Erreur API Pays/Provinces Fournisseurs:', error);
        res.status(500).json({ error: 'Erreur de connexion à ODBC' });
    } finally {
        if (connection) await connection.close();
    }
};

// Récupérer fournisseurs sans pays ni province
const getSuppliersNoCountryProvince = async (req, res) => {
    let connection;
    try {
        connection = await connectODBC();
        const result = await connection.query(`
            SELECT * 
            FROM Fou 
            WHERE Actif = 'O' 
            AND F_no = VDS_PaidToVendorLink 
            AND (pays IS NULL OR province IS NULL)
        `);

        const cleanedData = result.map((row) => {
            Object.keys(row).forEach((key) => {
                let convertedValue = convertToUTF8(row[key]);
                row[key] = cleanInvalidChars(convertedValue);
            });
            return row;
        });

        res.json(cleanedData);
    } catch (error) {
        console.error('Erreur API Fournisseurs sans pays/province:', error);
        res.status(500).json({ error: 'Erreur de connexion à ODBC' });
    } finally {
        if (connection) await connection.close();
    }
};

// Exporter toutes les fonctions
module.exports = { 
    getClients, 
    getContacts, 
    getDatabaseSchema, 
    getTablesWithRecords, 
    getTablesWithMoreThan100Records, 
    getTablesWithMoreThan100RecordsWithRelations,
    getSuppliers,
    getSuppliersCountriesProvinces,
    getSuppliersNoCountryProvince
};
