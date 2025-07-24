//geniusroutes.js
const express = require('express');
const { 
    getClients, 
    getContacts, 
    getDatabaseSchema, 
    getTablesWithRecords, 
    getTablesWithMoreThan100Records, 
    getTablesWithMoreThan100RecordsWithRelations,
    getSuppliers,
    getSuppliersCountriesProvinces,
    getSuppliersNoCountryProvince
} = require('../controllers/geniusController');

const router = express.Router();

router.get('/clients', getClients);
router.get('/contacts', getContacts);
router.get('/schema', getDatabaseSchema);
router.get('/tables-with-records', getTablesWithRecords);
router.get('/tables-more-than-100', getTablesWithMoreThan100Records);
router.get('/tables-with-more-than-100', getTablesWithMoreThan100RecordsWithRelations);
router.get('/suppliers', getSuppliers);
router.get('/suppliers/countries-provinces', getSuppliersCountriesProvinces);
router.get('/suppliers/no-country-province', getSuppliersNoCountryProvince);
module.exports = router;
