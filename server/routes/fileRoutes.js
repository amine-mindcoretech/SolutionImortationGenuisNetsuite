const express = require('express');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

const router = express.Router();

// Route pour enregistrer un fichier CSV
router.post('/save-file', (req, res) => {
  const { fileName, content } = req.body;

  if (!fileName || !content) {
    return res.status(400).json({ error: 'Nom de fichier et contenu requis' });
  }

  const filePath = path.join(__dirname, '../components', fileName);

  // Écriture du fichier
  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l’écriture du fichier:', err);
      return res.status(500).json({ error: 'Erreur lors de l’écriture du fichier' });
    }
    res.json({ message: `Fichier enregistré avec succès à ${filePath}` });
  });
});

// Route pour charger un fichier CSV
router.get('/load-file', (req, res) => {
  const { fileName } = req.query;

  if (!fileName) {
    return res.status(400).json({ error: 'Nom de fichier requis' });
  }

  const filePath = path.join(__dirname, '../components', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier introuvable' });
  }

  const rows = [];
  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (row) => rows.push(row))
    .on('end', () => {
      res.json(rows);
    })
    .on('error', (err) => {
      console.error('Erreur lors de la lecture du fichier:', err);
      res.status(500).json({ error: 'Erreur lors de la lecture du fichier' });
    });
});

module.exports = router;
