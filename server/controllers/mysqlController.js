// mysqlController.js
const pool = require('../config/mysqlConfig');

// Fonction pour déterminer le type SQL basé sur la valeur (version corrigée)
const inferColumnType = (value) => {
  if (value === null || value === undefined || value === '') return 'TEXT';

  // Vérifier les nombres
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'INT' : 'DECIMAL(10,2)';
  }

  // Vérifier les booléens
  if (typeof value === 'boolean') return 'BOOLEAN';

  // Vérifier les dates (strictement au format attendu par MySQL)
  if (typeof value === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/; // Format 'YYYY-MM-DD' ou 'YYYY-MM-DD HH:MM:SS'
    if (dateRegex.test(value) && !isNaN(new Date(value).getTime())) {
      return 'DATETIME';
    }
  }

  // Par défaut pour les chaînes ou autres types
  return 'TEXT';
};

const saveDataToMySQL = async (req, res) => {
  const { tableName, data } = req.body;

  console.log('Données reçues pour l\'enregistrement:', { tableName, data: data ? data.slice(0, 2) : null });

  if (!tableName || !data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({
      error: 'Paramètres invalides',
      details: {
        tableNameProvided: !!tableName,
        dataProvided: !!data,
        isArray: Array.isArray(data),
        dataLength: data ? data.length : 0,
      },
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Ajout d'une transaction pour cohérence

    // Déterminer les colonnes à partir de la première ligne
    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') {
      throw new Error('La première ligne de données est invalide');
    }

    const columns = Object.keys(firstRow);
    if (columns.length === 0) {
      throw new Error('Aucune colonne détectée dans les données');
    }

    // Créer les définitions de colonnes avec vérification de type
    const columnDefinitions = columns.map((key) => {
      const sampleValue = firstRow[key];
      const type = inferColumnType(sampleValue);
      console.log(`Colonne: ${key}, Valeur: ${sampleValue}, Type: ${type}`);
      return `\`${key}\` ${type}`;
    }).join(', ');

    // Supprimer la table si elle existe déjà
    await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    console.log(`Table ${tableName} supprimée si elle existait.`);

    // Créer la table avec les colonnes déduites
    const createTableQuery = `
      CREATE TABLE \`${tableName}\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ${columnDefinitions}
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    console.log('Requête de création:', createTableQuery);
    await connection.query(createTableQuery);
    console.log(`Table ${tableName} créée avec succès.`);

    // Normaliser les données de manière robuste
    const normalizedData = data.map((row, index) => {
      const normalizedRow = {};
      columns.forEach((col) => {
        let value = row[col];
        if (value === undefined || value === '') {
          value = null;
        } else if (typeof value === 'string') {
          value = value.replace(/[\x00-\x1F\x7F]/g, '').trim();
          if (value === '') value = null;
        } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          value = JSON.stringify(value);
        }
        normalizedRow[col] = value;
      });
      if (index < 3) {
        console.log(`Ligne normalisée ${index}:`, normalizedRow);
      }
      return normalizedRow;
    });

    // Insertion par lots
    const batchSize = 100;
    const totalBatches = Math.ceil(normalizedData.length / batchSize);
    console.log(`Début de l'insertion de ${normalizedData.length} lignes en ${totalBatches} lots...`);

    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min((i + 1) * batchSize, normalizedData.length);
      const batch = normalizedData.slice(batchStart, batchEnd);

      const placeholders = `(${columns.map(() => '?').join(', ')})`;
      const sql = `
        INSERT INTO \`${tableName}\` (${columns.map((key) => `\`${key}\``).join(', ')})
        VALUES ${batch.map(() => placeholders).join(', ')}
      `;
      const values = batch.flatMap((row) => columns.map((col) => row[col]));

      if (i === 0) {
        console.log('Exemple de requête SQL (premier lot):', sql);
        console.log('Exemple de valeurs (premières 10):', values.slice(0, 10));
        console.log('Nombre de valeurs dans le lot:', values.length);
      }

      await connection.query(sql, values);
      console.log(`Lot ${i + 1}/${totalBatches} inséré (lignes ${batchStart + 1}-${batchEnd})`);
    }

    await connection.commit(); // Valider la transaction
    console.log(`Toutes les données ont été insérées dans la table ${tableName}.`);

    res.json({
      success: true,
      message: 'Table créée et données enregistrées avec succès',
      details: {
        tableName,
        rowCount: normalizedData.length,
        columns: columns,
      },
    });
  } catch (error) {
    console.error('Erreur MySQL détaillée:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack,
    });

    if (connection) {
      await connection.rollback(); // Annuler la transaction en cas d'erreur
    }

    res.status(500).json({
      error: 'Erreur de traitement MySQL',
      details: {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
        suggestion: 'Vérifiez les données pour des valeurs problématiques ou des types incompatibles',
      },
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Erreur lors de la libération de la connexion:', releaseError);
      }
    }
  }
};

module.exports = { saveDataToMySQL };