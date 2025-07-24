//TabNavigation.jsx
import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import PageContainerBasic from './PageContainerBasic';
import PageContainerBasicUpdate from './PageContainerBasicUpdate';
import PageContainerContacts from './PageContainerContacts';
import PageContainerContactsUpdate from './PageContainerContactsUpdate';

function TabNavigation({ type }) {
  const [value, setValue] = useState(0);
  const navigate = useNavigate();

  const handleChange = (event, newValue) => {
    setValue(newValue);
    if (type === 'clients') {
      navigate(newValue === 0 ? '/afficher-clients/genius' : '/afficher-clients/mise-a-jour');
    } else if (type === 'contacts') {
      navigate(newValue === 0 ? '/afficher-contacts/genius' : '/afficher-contacts/mise-a-jour');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="Gestion des Données">
          <Tab label="Données Genius" />
          <Tab label="Données Mise à Jour" />
        </Tabs>
      </Box>
      <Routes>
        {type === 'clients' && (
          <>
            <Route path="genius" element={<PageContainerBasic />} />
            <Route path="mise-a-jour" element={<PageContainerBasicUpdate />} />
          </>
        )}
        {type === 'contacts' && (
          <>
            <Route path="genius" element={<PageContainerContacts />} />
            <Route path="mise-a-jour" element={<PageContainerContactsUpdate />} />
          </>
        )}
      </Routes>
    </Box>
  );
}

export default TabNavigation;
