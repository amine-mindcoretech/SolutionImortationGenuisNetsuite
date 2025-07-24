//server.js
// const express = require('express');
// const odbc = require('odbc');
// const cors = require('cors');
// const iconv = require('iconv-lite'); // Importer iconv-lite
// require('dotenv').config();

// const app = express();
// app.use(cors());
// const PORT = 5000;

// const connectionString = `DSN=GENIUS_READ;UID=genius_read;PWD=egeniusRD*;`;

// // Fonction de conversion en UTF-8 avec encodages multiples
// const convertToUTF8 = (value) => {
//     if (typeof value === 'string') {
//         let convertedValue = iconv.decode(Buffer.from(value, 'binary'), 'windows-1252'); // Conversion en windows-1252
//         if (convertedValue.includes('�')) {
//             convertedValue = iconv.decode(Buffer.from(value, 'binary'), 'ISO-8859-1'); // Essai en ISO-8859-1 si nécessaire
//         }
//         return convertedValue;
//     }
//     return value;
// };

// // Fonction de nettoyage manuel des caractères
// const cleanInvalidChars = (value) => {
//     if (typeof value === 'string') {
//         return value
//             .replace(/ý/g, 'É') // Remplacer "ý" par "É"
//             .replace(/ÿ/g, 'é') // Remplacer "ÿ" par "é"
//             .replace(/þ/g, 'è') // Remplacer "þ" par "è"
//             .replace(/Ý/g, 'À') // Remplacer "Ý" par "À"
//             .replace(/�/g, ''); // Supprimer les caractères invalides "�"
//     }
//     return value;
// };

// // Route API : Récupérer tous les clients
// app.get('/api/clients', async (req, res) => {
//     let connection;
//     try {
//         connection = await odbc.connect(connectionString);
//         const result = await connection.query("SELECT * FROM Cli WHERE actif = 'O' AND Fac_A = C_No AND IsNationalAccount = 0");

//         const cleanedData = result.map(row => {
//             Object.keys(row).forEach(key => {
//                 let convertedValue = convertToUTF8(row[key]);
//                 row[key] = cleanInvalidChars(convertedValue);
//             });
//             return row;
//         });

//         res.setHeader('Content-Type', 'application/json; charset=utf-8');
//         res.json(cleanedData);
//     } catch (error) {
//         console.error('Erreur API Clients :', error);
//         res.status(500).json({ error: 'Erreur de connexion à la base de données' });
//     } finally {
//         if (connection) await connection.close();
//     }
// });

// // Route API : Récupérer tous les contacts
// app.get('/api/contacts', async (req, res) => {
//     let connection;
//     try {
//         connection = await odbc.connect(connectionString);
//         const result = await connection.query("SELECT * FROM Cli WHERE actif = 'O' AND Fac_A <> C_No AND IsNationalAccount = 0");

//         const cleanedData = result.map(row => {
//             Object.keys(row).forEach(key => {
//                 let convertedValue = convertToUTF8(row[key]);
//                 row[key] = cleanInvalidChars(convertedValue);
//             });
//             return row;
//         });

//         res.setHeader('Content-Type', 'application/json; charset=utf-8');
//         res.json(cleanedData);
//     } catch (error) {
//         console.error('Erreur API Contacts :', error);
//         res.status(500).json({ error: 'Erreur de connexion à la base de données' });
//     } finally {
//         if (connection) await connection.close();
//     }
// });

// // Démarrer le serveur
// app.listen(PORT, () => {
//     console.log(`Serveur Node.js démarré sur http://localhost:${PORT}`);
// });




// server.js
// const express = require('express');
// const cors = require('cors');
// const geniusRoutes = require('./routes/geniusRoutes');
// const mysqlRoutes = require('./routes/mysqlRoutes');
// const fileRoutes = require('./routes/fileRoutes');
// const fournisseurRoutes = require('./routes/fournisseurRoutes');
// const clientRoutes = require('./routes/clientRoutes');
// const locationRoutes = require('./routes/locationRoutes');
// const itemCategoriesRoutes = require('./routes/itemCategoriesRoutes'); // Nouvelle route

// const app = express();

// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// app.use(cors());
// app.use('/api/genius', geniusRoutes);
// app.use('/api/mysql', mysqlRoutes);
// app.use('/api/files', fileRoutes);
// app.use('/api/fournisseur', fournisseurRoutes);
// app.use('/api/client', clientRoutes);
// app.use('/api/location', locationRoutes);
// app.use('/api/itemcategories', itemCategoriesRoutes); // Nouvelle route pour Item Categories

// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`Serveur démarré sur http://localhost:${PORT}`);
// });

// server.js
const express = require('express');
const cors = require('cors');
const exportRoutes = require('./routes/exportRoutes');
const geniusRoutes = require('./routes/geniusRoutes');
const mysqlRoutes = require('./routes/mysqlRoutes');
const fileRoutes = require('./routes/fileRoutes');
const fournisseurRoutes = require('./routes/fournisseurRoutes');
const clientRoutes = require('./routes/clientRoutes');
const contactRoutes = require('./routes/contactRoutes');
const locationRoutes = require('./routes/locationRoutes');
const itemCategoriesRoutes = require('./routes/itemCategoriesRoutes');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

app.use('/api/genius', geniusRoutes);
app.use('/api/mysql', mysqlRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/fournisseur', fournisseurRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/itemcategories', itemCategoriesRoutes);
app.use('/api/export', exportRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});