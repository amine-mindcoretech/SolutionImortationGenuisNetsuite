const locationModel = require('../models/locationModel');

const locationController = {
  async createTable(req, res) {
    try {
      const result = await locationModel.createTable();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async syncData(req, res) {
    try {
      const result = await locationModel.syncData();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async downloadCSV(req, res) {
    try {
      const csv = await locationModel.downloadCSV();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=locationgenius.csv');
      res.send(csv);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: error.message });
      } else {
        console.error('Error after headers sent:', error.message);
      }
    }
  },

  async dropTable(req, res) {
    try {
      const result = await locationModel.dropTable();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = locationController;