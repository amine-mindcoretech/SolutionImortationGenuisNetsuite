const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

router.post('/create', locationController.createTable);
router.get('/sync', locationController.syncData); // Changed from POST to GET
router.get('/download-csv', locationController.downloadCSV);
router.delete('/drop', locationController.dropTable);

module.exports = router;