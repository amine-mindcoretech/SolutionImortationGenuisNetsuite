import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ButtonAppBar from './components/ButtonAppBar';
import SelectedListItem from './components/SelectedListItem';
import PageContainerBasic from './components/PageContainerBasic';
import PageContainerContacts from './components/PageContainerContacts';
import PageContainerBasicUpdate from './components/PageContainerBasicUpdate';
import DatabaseSchema from './components/DatabaseSchema';
import { SearchProvider } from './context/SearchContext';
import PageContainerSuppliers from './components/PageContainerSuppliers';
import PageContainerSuppliersUpdate from './components/PageContainerSuppliersUpdate';
import PageContainerLocations from './components/PageContainerLocations';
import PageContainerItemCategories from './components/PageContainerItemCategories'; // Nouveau composant
import './App.css';

function App() {
  const [collapsed, setCollapsed] = useState(false);
  console.log("hhahahahaha", DatabaseSchema);

  useEffect(() => {
    setCollapsed(false);
  }, []);

  return (
    <SearchProvider>
      <Router>
        <div className="app-container">
          <header>
            <ButtonAppBar onToggle={() => setCollapsed(!collapsed)} user="Utilisateur" />
          </header>
          <div className="content-container">
            <aside className={collapsed ? 'collapsed' : ''}>
              <SelectedListItem collapsed={collapsed} />
            </aside>
            <main>
              <Routes>
                <Route path="/" element={<h3>Bienvenue, sélectionnez une option.</h3>} />
                <Route path="/afficher-clients/Genius" element={<PageContainerBasic />} />
                <Route path="/afficher-clients/Update" element={<PageContainerBasicUpdate />} />
                <Route path="/afficher-contacts" element={<PageContainerContacts />} />
                <Route path="/afficher-fournisseurs" element={<PageContainerSuppliers />} />
                <Route path="/afficher-fournisseurs/Update" element={<PageContainerSuppliersUpdate />} />
                <Route path="/afficher-locations" element={<PageContainerLocations />} />
                <Route path="/afficher-itemcategories" element={<PageContainerItemCategories />} /> {/* Nouvelle route */}
                <Route path="/schema" element={<DatabaseSchema />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </SearchProvider>
  );
}

export default App;