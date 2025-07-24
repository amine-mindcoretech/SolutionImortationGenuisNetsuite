// PageContainerSuppliers.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  useGridApiContext,
  useGridApiRef,
} from '@mui/x-data-grid';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { useSearch } from '../context/SearchContext';

// Custom toolbar component
function CustomToolbar() {
  const apiRef = useGridApiContext();

  const escapeCsvValue = (value) => {
    if (typeof value === 'string') {
      return `"${value.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ')}"`;
    }
    return value !== null && value !== undefined ? `"${value}"` : '""';
  };

  const handleSaveToFile = async () => {
    const fileName = 'suppliers_updated.xlsx';

    try {
      const visibleColumns = apiRef.current.getVisibleColumns();
      const rows = Array.from(apiRef.current.getRowModels().values());

      const sheetData = rows.map((row) =>
        visibleColumns.reduce((acc, col) => {
          acc[col.headerName] = row[col.field] || '';
          return acc;
        }, {})
      );

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Excel File',
              accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(excelBuffer);
        await writable.close();
      } else {
        const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
        FileSaver.saveAs(data, fileName);
      }

      alert('Les modifications ont été enregistrées dans le fichier Excel.');
    } catch (error) {
      console.error('Erreur lors de l’enregistrement des modifications :', error);
      alert('Erreur lors de l’enregistrement des modifications.');
    }
  };

  const handleExportCSV = async () => {
    const visibleColumns = apiRef.current.getVisibleColumns();
    const rows = Array.from(apiRef.current.getRowModels().values());

    const headers = visibleColumns.map((col) => escapeCsvValue(col.headerName)).join(',');
    const rowsData = rows
      .map((row) =>
        visibleColumns.map((col) => escapeCsvValue(row[col.field] || '')).join(',')
      )
      .join('\n');

    const csvContent = `\uFEFF${headers}\n${rowsData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'suppliers_utf8.csv',
          types: [
            {
              description: 'CSV Files',
              accept: { 'text/csv': ['.csv'] },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        alert('Fichier CSV enregistré avec succès.');
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'suppliers_utf8.csv';
        link.click();
      }
    } catch (error) {
      console.error('Erreur lors de l’enregistrement du fichier CSV :', error);
      alert('Une erreur est survenue lors de l’enregistrement du fichier.');
    }
  };

  const handleExportHeaderAndFirstRow = () => {
    const visibleColumns = apiRef.current.getVisibleColumns();
    const firstRow = Array.from(apiRef.current.getRowModels().values())[0];

    const headers = visibleColumns.map((col) => col.headerName).join(',');
    const firstRowData = firstRow
      ? visibleColumns.map((col) => escapeCsvValue(firstRow[col.field] || '')).join(',')
      : '';

    const csvContent = `\uFEFF${headers}\n${firstRowData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'suppliers_utf8_first_row.csv';
    link.click();
  };

  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
      <Button
        onClick={handleExportCSV}
        variant="text"
        sx={{ marginLeft: '10px', color: 'inherit' }}
      >
        Exporter en CSV (UTF-8)
      </Button>
      <Button
        onClick={handleExportHeaderAndFirstRow}
        variant="text"
        sx={{ marginLeft: '10px', color: 'inherit' }}
      >
        Exporter Header + 1ère ligne
      </Button>
      <Button
        onClick={handleSaveToFile}
        variant="text"
        sx={{ marginLeft: '10px', color: 'inherit' }}
      >
        Enregistrer les modifications
      </Button>
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

export default function PageContainerSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnPosition, setNewColumnPosition] = useState('');
  const [newColumnValue, setNewColumnValue] = useState('');
  const [cloneColumn, setCloneColumn] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const apiRef = useGridApiRef();
  const columnNumbersRef = useRef(null);
  const dataGridRef = useRef(null);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const { searchTerm } = useSearch();

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/genius/suppliers')
      .then((response) => {
        const data = response.data;

        setSuppliers(data);
        setFilteredSuppliers(data);

        if (data.length > 0) {
          const dynamicColumns = Object.keys(data[0]).map((key) => ({
            field: key,
            headerName: key,
            width: 200,
          }));
          setColumns(dynamicColumns);
        }
      })
      .catch((error) => console.error('Erreur API :', error))
      .finally(() => setLoading(false));
  }, []);

  const handleColumnChange = (event) => {
    const selectedField = event.target.value;
    setSelectedColumn(selectedField);

    const column = columns.find((col) => col.field === selectedField);
    if (column) setInputValue(column.headerName);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleUpdateColumnName = () => {
    if (!selectedColumn) return;

    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.field === selectedColumn ? { ...col, headerName: inputValue } : col
      )
    );
  };

  const handleUpdateColumnPosition = () => {
    if (!selectedColumn || isNaN(newPosition)) return;

    const currentIndex = columns.findIndex((col) => col.field === selectedColumn);
    const newIndex = parseInt(newPosition, 10);

    if (currentIndex === -1 || newIndex < 0 || newIndex >= columns.length) return;

    const updatedColumns = [...columns];
    const [movedColumn] = updatedColumns.splice(currentIndex, 1);
    updatedColumns.splice(newIndex, 0, movedColumn);

    setColumns(updatedColumns);
    setNewPosition('');
  };

  const handleAddNewColumn = () => {
    if (!newColumnName.trim() || isNaN(newColumnPosition)) return;

    const position = parseInt(newColumnPosition, 10);
    const newColumn = {
      field: newColumnName,
      headerName: newColumnName,
      width: 200,
    };

    setColumns((prevColumns) => [
      ...prevColumns.slice(0, position),
      newColumn,
      ...prevColumns.slice(position),
    ]);

    setSuppliers((prevSuppliers) =>
      prevSuppliers.map((supplier) => ({
        ...supplier,
        [newColumnName]: cloneColumn
          ? supplier[cloneColumn] || ''
          : newColumnValue,
      }))
    );

    setNewColumnName('');
    setNewColumnPosition('');
    setNewColumnValue('');
    setCloneColumn('');
  };

  const handleScrollSync = (e) => {
    if (e.target === columnNumbersRef.current) {
      dataGridRef.current.querySelector('.MuiDataGrid-virtualScroller').scrollLeft = e.target.scrollLeft;
    } else if (e.target === dataGridRef.current.querySelector('.MuiDataGrid-virtualScroller')) {
      columnNumbersRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Update filteredSuppliers whenever searchTerm changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      setFilteredSuppliers(
        suppliers.filter((supplier) =>
          Object.values(supplier).some(
            (value) =>
              value &&
              value.toString().toLowerCase().includes(lowercasedTerm)
          )
        )
      );
    }
  }, [searchTerm, suppliers]);

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      <Typography variant="h4" sx={{ marginBottom: '20px' }}>
        Liste des Fournisseurs
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        {/* Box à gauche */}
        <Box sx={{ width: '48%' }}>
          <FormControl fullWidth sx={{ marginBottom: '20px' }}>
            <InputLabel id="column-select-label">Sélectionner une colonne</InputLabel>
            <Select
              labelId="column-select-label"
              value={selectedColumn}
              onChange={handleColumnChange}
              label="Sélectionner une colonne"
            >
              {columns.map((column) => (
                <MenuItem key={column.field} value={column.field}>
                  {column.headerName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Nom de la colonne"
            value={inputValue}
            onChange={handleInputChange}
            fullWidth
            sx={{ marginBottom: '20px' }}
          />

          <Button
            variant="contained"
            onClick={handleUpdateColumnName}
            disabled={!selectedColumn || inputValue.trim() === ''}
            fullWidth
            sx={{ marginBottom: '10px' }}
          >
            Modifier
          </Button>

          <TextField
            label="Nouvelle Position"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            type="number"
            fullWidth
            sx={{ marginBottom: '20px' }}
          />

          <Button
            variant="contained"
            onClick={handleUpdateColumnPosition}
            disabled={!selectedColumn || newPosition.trim() === ''}
            fullWidth
          >
            Déplacer
          </Button>
        </Box>

        {/* Box à droite */}
        <Box sx={{ width: '48%' }}>
          <TextField
            label="Nom de la nouvelle colonne"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            fullWidth
            sx={{ marginBottom: '20px' }}
          />
          <TextField
            label="Position"
            value={newColumnPosition}
            onChange={(e) => setNewColumnPosition(e.target.value)}
            type="number"
            fullWidth
            sx={{ marginBottom: '20px' }}
          />
          <TextField
            label="Valeur par défaut"
            value={newColumnValue}
            onChange={(e) => setNewColumnValue(e.target.value)}
            fullWidth
            sx={{ marginBottom: '20px' }}
          />
          <FormControl fullWidth sx={{ marginBottom: '20px' }}>
            <InputLabel id="clone-column-select-label">Cloner une colonne</InputLabel>
            <Select
              labelId="clone-column-select-label"
              value={cloneColumn}
              onChange={(e) => setCloneColumn(e.target.value)}
              label="Cloner une colonne"
            >
              {columns.map((column) => (
                <MenuItem key={column.field} value={column.field}>
                  {column.headerName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="contained" onClick={handleAddNewColumn} fullWidth>
            Ajouter
          </Button>
        </Box>
      </Box>

      {/* Column Numbers */}
      <Box
        ref={columnNumbersRef}
        sx={{
          display: 'flex',
          marginBottom: '10px',
          overflowX: 'auto',
        }}
        onScroll={handleScrollSync}
      >
        <Box
          sx={{
            display: 'inline-flex',
            width: '100%',
          }}
        >
          {columns.map((column, index) => (
            <Box
              key={index}
              sx={{
                flexShrink: 0,
                width: column.width,
                textAlign: 'center',
                borderBottom: '1px solid #ccc',
                padding: '5px 0',
                boxSizing: 'border-box',
              }}
            >
              {index}
            </Box>
          ))}
        </Box>
      </Box>

      {/* DataGrid */}
      <div style={{ height: 600, width: '100%' }} ref={dataGridRef} onScroll={handleScrollSync}>
        <DataGrid
          apiRef={apiRef}
          rows={filteredSuppliers.map((supplier, index) => ({ id: index, ...supplier }))}
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