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

export default function PageContainerLocations() {
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const { searchTerm } = useSearch();

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/location/sync');
        if (response.data.success) {
          const csvResponse = await axios.get('http://localhost:5000/api/location/download-csv', {
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
                name: values[0],
                'External ID': values[1],
                parent: values[2],
                subsidiary: values[3],
                locationtype: values[4],
                timezone: values[5],
                usebins: values[6],
                makeinventoryavailable: values[7],
                usewarehousemanagement: values[8],
                includeinsupplyplanning: values[9],
                includeincontroltower: values[10],
                addr1: values[11],
                city: values[12],
                country: values[13],
                state: values[14],
                zip: values[15],
                addrphone: values[16],
                last_updated: values[17],
              };
            });

          setLocations(rows);
          setFilteredLocations(rows);

          if (rows.length > 0) {
            const dynamicColumns = Object.keys(rows[0]).map((key) => ({
              field: key,
              headerName: key,
              width: 200,
            }));
            setColumns(dynamicColumns);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des emplacements :', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filteredData = locations.filter((location) =>
        Object.values(location).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(lowercasedTerm)
        )
      );
      setFilteredLocations(filteredData);
    } else {
      setFilteredLocations(locations);
    }
  }, [searchTerm, locations]);

  const handleDownloadCSV = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/location/download-csv', {
        responseType: 'text',
      });
      const csvContent = response.data;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'locations_for_netsuite.csv';
      link.click();
    } catch (error) {
      console.error('Erreur lors du téléchargement du CSV :', error);
      alert('Une erreur est survenue lors du téléchargement du fichier CSV.');
    }
  };

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      <Typography variant="h4" sx={{ marginBottom: '20px' }}>
        Emplacements pour NetSuite
      </Typography>

      <Box sx={{ marginBottom: '20px' }}>
        <Button variant="contained" onClick={handleDownloadCSV}>
          Télécharger le CSV pour NetSuite
        </Button>
      </Box>

      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredLocations.map((location, index) => ({ id: index, ...location }))}
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