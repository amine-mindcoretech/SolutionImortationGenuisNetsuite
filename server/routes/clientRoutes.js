// const express = require('express');
// const router = express.Router();
// const fournisseurController = require('../controllers/fournisseurController');

// router.post('/create', fournisseurController.createTable);
// router.post('/sync', fournisseurController.syncData);
// router.delete('/drop', fournisseurController.dropTable);

// module.exports = router;
// routes/clientRoutes.js
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.post('/create', clientController.createTable);
router.post('/sync', clientController.syncData);
router.get('/download-csv', clientController.downloadCSV);
router.delete('/drop', clientController.dropTable);

module.exports = router;