const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.post('/create', contactController.createTable);
router.post('/sync', contactController.syncData);
router.get('/download-csv', contactController.downloadCSV);
router.delete('/drop', contactController.dropTable);

module.exports = router;