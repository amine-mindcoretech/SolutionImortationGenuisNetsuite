import React, { useState, useRef, useEffect } from 'react';
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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { useSearch } from '../context/SearchContext';

function CustomToolbar({ setColumns, setSuppliers, filteredSuppliers }) {
  const apiRef = useGridApiContext();
  const [openDialog, setOpenDialog] = useState(false);
  const [tableName, setTableName] = useState('');

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

      if (filteredSuppliers.length === 0) {
        alert('Aucune ligne visible à enregistrer après le filtrage.');
        return;
      }

      const sheetData = filteredSuppliers.map((row) =>
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

      alert('Les modifications ont été enregistrées dans le fichier Excel (lignes filtrées uniquement).');
    } catch (error) {
      console.error('Erreur lors de l’enregistrement des modifications :', error);
      alert('Erreur lors de l’enregistrement des modifications.');
    }
  };

  const handleExportCSV = async () => {
    const visibleColumns = apiRef.current.getVisibleColumns();

    if (filteredSuppliers.length === 0) {
      alert('Aucune ligne visible à exporter après le filtrage.');
      return;
    }

    const headers = visibleColumns.map((col) => escapeCsvValue(col.headerName)).join(',');
    const rowsData = filteredSuppliers
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
              description: 'CSV File',
              accept: { 'text/csv': ['.csv'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        alert('Fichier CSV enregistré avec succès (lignes filtrées uniquement).');
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
    const firstTenRows = filteredSuppliers.slice(0, 10);

    if (filteredSuppliers.length === 0) {
      alert('Aucune ligne visible à exporter après le filtrage.');
      return;
    }

    const headers = visibleColumns.map((col) => escapeCsvValue(col.headerName)).join(',');
    const rowsData = firstTenRows
      .map((row) =>
        visibleColumns.map((col) => escapeCsvValue(row[col.field] || '')).join(',')
      )
      .join('\n');

    const csvContent = `\uFEFF${headers}\n${rowsData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'suppliers_utf8_first_10_rows.csv';
    link.click();
  };

  const handleSaveToMySQL = async () => {
    if (!tableName) {
      alert('Veuillez entrer un nom de table.');
      return;
    }

    try {
      const visibleColumns = apiRef.current.getVisibleColumns();

      if (filteredSuppliers.length === 0) {
        alert('Aucune ligne visible à enregistrer après le filtrage.');
        return;
      }

      const dataToSave = filteredSuppliers.map((row, index) => {
        const normalizedRow = {};
        visibleColumns.forEach((col) => {
          normalizedRow[col.field] = row[col.field] !== undefined ? row[col.field] : null;
        });
        console.log(`Ligne frontend ${index}:`, normalizedRow);
        return normalizedRow;
      });

      console.log('Données envoyées au backend:', { tableName, data: dataToSave });

      const response = await axios.post('http://localhost:5000/api/mysql/save-data', {
        tableName,
        data: dataToSave,
      });

      alert(response.data.message);
      setOpenDialog(false);
      setTableName('');
    } catch (error) {
      console.error('Erreur lors de l’enregistrement dans MySQL :', error);
      alert('Erreur lors de l’enregistrement dans MySQL : ' + (error.response?.data?.details || error.message));
    }
  };

  return (
    <>
      <GridToolbarContainer>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport />
        <Button onClick={handleExportCSV} variant="text" sx={{ marginLeft: '10px', color: 'inherit' }}>
          Exporter en CSV (UTF-8)
        </Button>
        <Button onClick={handleExportHeaderAndFirstRow} variant="text" sx={{ marginLeft: '10px', color: 'inherit' }}>
          Exporter Header + 1ère ligne
        </Button>
        <Button onClick={handleSaveToFile} variant="text" sx={{ marginLeft: '10px', color: 'inherit' }}>
          Enregistrer les modifications
        </Button>
        <Button onClick={() => setOpenDialog(true)} variant="text" sx={{ marginLeft: '10px', color: 'inherit' }}>
          Enregistrer dans MySQL
        </Button>
      </GridToolbarContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Enregistrer dans MySQL</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de la table"
            fullWidth
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button onClick={handleSaveToMySQL}>Valider</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function CustomLoadingOverlay() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress />
    </Box>
  );
}

export default function PageContainerSuppliersUpdate() {
  const [suppliers, setSuppliers] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnPosition, setNewColumnPosition] = useState('');
  const [newColumnValue, setNewColumnValue] = useState('');
  const [cloneColumn, setCloneColumn] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const columnNumbersRef = useRef(null);
  const dataGridRef = useRef(null);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const { searchTerm } = useSearch();
  const [existingValue, setExistingValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValues, setFilterValues] = useState('');
  const [filterCondition, setFilterCondition] = useState('contains');

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const response = await axios.post('http://localhost:5000/api/fournisseur/sync');
        const { data } = response.data; // Extract the transformed data

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
      } catch (error) {
        console.error('Erreur lors de la récupération des fournisseurs :', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  useEffect(() => {
    let filteredData = [...suppliers];

    if (filterColumn && filterValues) {
      const valuesToFilter = filterValues
        .split('&')
        .map((val) => val.trim().toLowerCase())
        .filter((val) => val);

      if (valuesToFilter.length > 0) {
        filteredData = filteredData.filter((supplier) => {
          const value = supplier[filterColumn];
          if (!value) return filterCondition === 'notContains';
          const matches = valuesToFilter.includes(value.toString().toLowerCase());
          return filterCondition === 'contains' ? matches : !matches;
        });
      }
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filteredData = filteredData.filter((supplier) =>
        Object.values(supplier).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(lowercasedTerm)
        )
      );
    }

    setFilteredSuppliers(filteredData);
  }, [suppliers, searchTerm, filterColumn, filterValues, filterCondition]);

  const handleUpdateValues = () => {
    if (!selectedColumn) {
      alert('Veuillez sélectionner une colonne.');
      return;
    }

    setSuppliers((prevSuppliers) =>
      prevSuppliers.map((supplier) => {
        const currentValue = supplier[selectedColumn];
        if (existingValue === '' && (currentValue === '' || currentValue === null || currentValue === undefined)) {
          return { ...supplier, [selectedColumn]: newValue };
        }
        if (String(currentValue) === String(existingValue)) {
          return { ...supplier, [selectedColumn]: newValue };
        }
        return supplier;
      })
    );
    setFilteredSuppliers((prevFiltered) =>
      prevFiltered.map((supplier) => {
        const currentValue = supplier[selectedColumn];
        if (existingValue === '' && (currentValue === '' || currentValue === null || currentValue === undefined)) {
          return { ...supplier, [selectedColumn]: newValue };
        }
        if (String(currentValue) === String(existingValue)) {
          return { ...supplier, [selectedColumn]: newValue };
        }
        return supplier;
      })
    );
  };

  const handleExtractDate = () => {
    if (!selectedColumn) {
      alert('Veuillez sélectionner une colonne contenant des dates.');
      return;
    }

    setSuppliers((prevSuppliers) =>
      prevSuppliers.map((supplier) => {
        const value = supplier[selectedColumn];
        if (value && typeof value === 'string' && /\d{4}-\d{2}-\d{2}/.test(value)) {
          const datePart = value.split(' ')[0];
          return { ...supplier, [selectedColumn]: datePart };
        }
        return supplier;
      })
    );
    setFilteredSuppliers((prevFiltered) =>
      prevFiltered.map((supplier) => {
        const value = supplier[selectedColumn];
        if (value && typeof value === 'string' && /\d{4}-\d{2}-\d{2}/.test(value)) {
          const datePart = value.split(' ')[0];
          return { ...supplier, [selectedColumn]: datePart };
        }
        return supplier;
      })
    );
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length > 0) {
          const dynamicColumns = Object.keys(jsonData[0] || {}).map((key) => ({
            field: key,
            headerName: key,
            width: 200,
          }));
          setColumns(dynamicColumns);
          setSuppliers(jsonData);
          setFilteredSuppliers(jsonData);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

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

  const handleFilterColumnChange = (event) => {
    setFilterColumn(event.target.value);
  };

  const handleFilterValuesChange = (event) => {
    setFilterValues(event.target.value);
  };

  const handleFilterConditionChange = (event) => {
    setFilterCondition(event.target.value);
  };

  const clearFilter = () => {
    setFilterColumn('');
    setFilterValues('');
    setFilterCondition('contains');
  };

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      <Typography variant="h4" sx={{ marginBottom: '20px' }}>
        Outil de Modification Fournisseurs
      </Typography>

      <Box sx={{ marginBottom: '20px' }}>
        <Button variant="contained" component="label" sx={{ marginBottom: '10px' }}>
          Importer un fichier Excel
          <input type="file" accept=".xlsx" hidden onChange={handleFileUpload} />
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <FormControl sx={{ width: '200px' }}>
          <InputLabel id="filter-column-select-label">Colonne à filtrer</InputLabel>
          <Select
            labelId="filter-column-select-label"
            value={filterColumn}
            onChange={handleFilterColumnChange}
            label="Colonne à filtrer"
          >
            <MenuItem value="">
              <em>Aucune</em>
            </MenuItem>
            {columns.map((column) => (
              <MenuItem key={column.field} value={column.field}>
                {column.headerName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ width: '150px' }}>
          <InputLabel id="filter-condition-select-label">Condition</InputLabel>
          <Select
            labelId="filter-condition-select-label"
            value={filterCondition}
            onChange={handleFilterConditionChange}
            label="Condition"
          >
            <MenuItem value="contains">Comporte</MenuItem>
            <MenuItem value="notContains">Ne comporte pas</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Valeurs (séparées par &)"
          value={filterValues}
          onChange={handleFilterValuesChange}
          placeholder="ex: Manitoba & Colorado"
          sx={{ width: '300px' }}
        />
        <Button variant="contained" onClick={clearFilter}>
          Réinitialiser le filtre
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
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
          <TextField
            label="Valeur Existante (vide pour cibler les vides)"
            value={existingValue}
            onChange={(e) => setExistingValue(e.target.value)}
            fullWidth
            sx={{ marginBottom: '20px' }}
          />
          <TextField
            label="Nouvelle Valeur (vide pour effacer)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            fullWidth
            sx={{ marginBottom: '20px' }}
          />

          <Box sx={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="contained"
              onClick={handleUpdateColumnName}
              disabled={!selectedColumn || inputValue.trim() === ''}
              sx={{ width: '33%' }}
            >
              Modifier nom colonne
            </Button>
            <Button
              variant="contained"
              onClick={handleUpdateValues}
              sx={{ width: '33%' }}
            >
              Appliquer la Modification
            </Button>
            <Button
              variant="contained"
              onClick={handleExtractDate}
              sx={{ width: '33%' }}
            >
              Extraire la Date
            </Button>
          </Box>

          <TextField
            label="Nouvelle Position"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            type="number"
            fullWidth
            sx={{ marginTop: '20px', marginBottom: '20px' }}
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

      <Box
        ref={columnNumbersRef}
        sx={{ display: 'flex', marginBottom: '10px', overflowX: 'auto' }}
        onScroll={handleScrollSync}
      >
        <Box sx={{ display: 'inline-flex', width: '100%' }}>
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

      <div style={{ height: 600, width: '100%' }} ref={dataGridRef} onScroll={handleScrollSync}>
        <DataGrid
          rows={filteredSuppliers.map((supplier, index) => ({ id: index, ...supplier }))}
          columns={columns}
          loading={loading}
          slots={{
            toolbar: () => (
              <CustomToolbar
                setColumns={setColumns}
                setSuppliers={setSuppliers}
                filteredSuppliers={filteredSuppliers}
              />
            ),
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