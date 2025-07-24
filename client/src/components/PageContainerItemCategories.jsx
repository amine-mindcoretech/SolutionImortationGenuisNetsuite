import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from '@mui/x-data-grid';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import axios from 'axios';
import { useSearch } from '../context/SearchContext';
import * as XLSX from 'xlsx';

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}

function CustomLoadingOverlay() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress />
    </Box>
  );
}

export default function PageContainerItemCategories() {
  const [itemCategories, setItemCategories] = useState([]);
  const [filteredItemCategories, setFilteredItemCategories] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const { searchTerm } = useSearch();

  useEffect(() => {
    const fetchItemCategories = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/itemcategories/sync');
        if (response.data.success) {
          const csvResponse = await axios.get('http://localhost:5000/api/itemcategories/download-csv', {
            responseType: 'text',
          });
          const csvData = csvResponse.data;
          const rows = csvData
            .split('\n')
            .slice(1)
            .filter(row => row.trim() !== '')
            .map(row => {
              const values = row.split(',').map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));
              return {
                Name: values[0].replace(/�/g, 'É'),
                External_ID: values[1].replace(/�/g, 'É'),
                Description: values[2].replace(/�/g, 'É'),
                cm_gl: values[3],
                pv_gl: values[4],
                dp_gl: values[5],
                last_updated: values[6],
              };
            });

          // Ajouter la colonne subsidiary avec la valeur "Parent Company : Mindcore"
          const cleanedRows = rows.map(row => ({
            ...row,
            Name: row.Name.replace(/�/g, 'É'),
            External_ID: row.External_ID.replace(/�/g, 'É'),
            Description: row.Description.replace(/�/g, 'É'),
            subsidiary: 'Parent Company : Mindcore',
          }));

          setItemCategories(cleanedRows);
          setFilteredItemCategories(cleanedRows);

          if (cleanedRows.length > 0) {
            const dynamicColumns = Object.keys(cleanedRows[0]).map((key) => ({
              field: key,
              headerName: key,
              width: 200,
            }));
            setColumns(dynamicColumns);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des catégories d\'items :', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItemCategories();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filteredData = itemCategories.filter((item) =>
        Object.values(item).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(lowercasedTerm)
        )
      );
      setFilteredItemCategories(filteredData);
    } else {
      setFilteredItemCategories(itemCategories);
    }
  }, [searchTerm, itemCategories]);

  const handleDownloadXLSX = async () => {
    try {
      // Préparer les données pour Excel avec la colonne subsidiary
      const worksheetData = itemCategories.map(item => ({
        Name: item.Name,
        External_ID: item.External_ID,
        Description: item.Description,
        subsidiary: item.subsidiary,
        cm_gl: item.cm_gl,
        pv_gl: item.pv_gl,
        dp_gl: item.dp_gl,
        last_updated: item.last_updated,
      }));

      // Créer une feuille de calcul
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ItemCategories');

      // Générer et télécharger le fichier .xlsx
      XLSX.writeFile(workbook, 'itemCategories.xlsx');
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier XLSX :', error);
      alert('Une erreur est survenue lors du téléchargement du fichier XLSX.');
    }
  };

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      <Typography variant="h4" sx={{ marginBottom: '20px' }}>
        Catégories d'Items pour NetSuite
      </Typography>

      <Box sx={{ marginBottom: '20px' }}>
        <Button variant="contained" onClick={handleDownloadXLSX}>
          Télécharger le fichier XLSX pour NetSuite
        </Button>
      </Box>

      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredItemCategories.map((item, index) => ({ id: index, ...item }))}
          columns={columns}
          loading={loading}
          slots={{
            toolbar: CustomToolbar,
            loadingOverlay: CustomLoadingOverlay,
          }}
          disableRowSelectionOnClick
          disableSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </div>
    </div>
  );
}