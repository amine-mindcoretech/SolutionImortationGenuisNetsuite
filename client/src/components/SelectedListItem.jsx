import React from 'react';
import { useNavigate } from 'react-router-dom';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PeopleIcon from '@mui/icons-material/People';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category'; // Icône pour Item Categories

export default function SelectedListItem({ collapsed }) {
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { label: 'Afficher les clients Genius', icon: <PeopleIcon />, path: '/afficher-clients/Genius' },
    { label: 'Outil de Modification Clients', icon: <PeopleIcon />, path: '/afficher-clients/Update' },
    { label: 'Afficher les contacts', icon: <PeopleIcon />, path: '/afficher-contacts' },
    { label: 'Afficher les fournisseurs', icon: <PeopleIcon />, path: '/afficher-fournisseurs' },
    { label: 'Outil de Modification Fournisseurs', icon: <PeopleIcon />, path: '/afficher-fournisseurs/Update' },
    { label: 'Afficher les emplacements', icon: <LocationOnIcon />, path: '/afficher-locations' },
    { label: 'Afficher les catégories d\'items', icon: <CategoryIcon />, path: '/afficher-itemcategories' }, // Nouvelle option
    { label: 'Schema', icon: <DashboardIcon />, path: '/schema' },
  ];

  return (
    <List style={{ backgroundColor: '#edf2fa', height: '100%' }}>
      {menuItems.map((item, index) => (
        <ListItem key={index} button onClick={() => navigate(item.path)}>
          <ListItemIcon>{item.icon}</ListItemIcon>
          {!collapsed && <ListItemText primary={item.label} />}
        </ListItem>
      ))}
    </List>
  );
}