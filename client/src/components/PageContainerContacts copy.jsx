//PageContainerContacts.jsx
import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  useGridApiContext,
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
import axios from 'axios';

// Custom toolbar component
function CustomToolbar() {
  const apiRef = useGridApiContext();

  const escapeCsvValue = (value) => {
    if (typeof value === 'string') {
      return `"${value.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ')}"`;
    }
    return value !== null && value !== undefined ? `"${value}"` : '""';
  };

  const handleExportCSV = () => {
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
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contacts_utf8.csv';
    link.click();
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
    link.download = 'contacts_utf8_first_row.csv';
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
        sx={{ marginLeft: '10px', color: '#43a047' }}
      >
        Exporter en CSV (UTF-8)
      </Button>
      <Button
        onClick={handleExportHeaderAndFirstRow}
        variant="text"
        sx={{ marginLeft: '10px', color: '#43a047' }}
      >
        Exporter Header + 1ère ligne
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

export default function PageContainerContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnPosition, setNewColumnPosition] = useState('');
  const [newColumnValue, setNewColumnValue] = useState('');
  const [cloneColumn, setCloneColumn] = useState('');
  const [newPosition, setNewPosition] = useState('');

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/contacts')
      .then((response) => {
        const data = response.data;

        setContacts(data);

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

    setContacts((prevContacts) =>
      prevContacts.map((contact) => ({
        ...contact,
        [newColumnName]: cloneColumn
          ? contact[cloneColumn] || ''
          : newColumnValue,
      }))
    );

    setNewColumnName('');
    setNewColumnPosition('');
    setNewColumnValue('');
    setCloneColumn('');
  };

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      <Typography variant="h4" sx={{ marginBottom: '20px' }}>
        Liste des Contacts
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
        <FormControl fullWidth sx={{ width: '300px', marginRight: '20px' }}>
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
          sx={{ marginRight: '20px', width: '300px' }}
        />

        <Button
          variant="contained"
          onClick={handleUpdateColumnName}
          disabled={!selectedColumn || inputValue.trim() === ''}
        >
          Modifier
        </Button>
        <TextField
          label="Nouvelle Position"
          value={newPosition}
          onChange={(e) => setNewPosition(e.target.value)}
          sx={{ width: '150px' }}
          type="number"
        />

        <Button
          variant="contained"
          onClick={handleUpdateColumnPosition}
          disabled={!selectedColumn || newPosition.trim() === ''}
        >
          Déplacer
        </Button>

      </Box>

       <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
        <TextField
          label="Nom de la nouvelle colonne"
          value={newColumnName}
          onChange={(e) => setNewColumnName(e.target.value)}
          sx={{ marginRight: '20px', width: '300px' }}
        />
        <TextField
          label="Position"
          value={newColumnPosition}
          onChange={(e) => setNewColumnPosition(e.target.value)}
          sx={{ marginRight: '20px', width: '100px' }}
          type="number"
        />
        <TextField
          label="Valeur par défaut"
          value={newColumnValue}
          onChange={(e) => setNewColumnValue(e.target.value)}
          sx={{ marginRight: '20px', width: '300px' }}
        />
        <FormControl fullWidth sx={{ width: '300px', marginRight: '20px' }}>
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
        <Button variant="contained" onClick={handleAddNewColumn}>
          Ajouter
        </Button>
      </Box>

      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={contacts.map((contact, index) => ({ id: index, ...contact }))}
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
