//DatabaseSchema.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';

export default function DatabaseSchema() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Récupérer les données de l'API
  useEffect(() => {
    axios
      .get('http://localhost:5000/api/genius/tables-more-than-100')
      .then((response) => {
        //console.log('Données récupérées :', response.data);

        // Construire les nœuds (nodes) à partir des données
        const nodesData = response.data.tables.map((table, index) => ({
          id: table.tableName,
          data: { label: `${table.tableName} (${table.recordCount} records)` },
          position: { x: (index % 10) * 150, y: Math.floor(index / 10) * 150 },
        }));

        // (Optionnel) Ajouter des relations sous forme de connexions (edges)
        const edgesData = []; // Ajouter des relations ici si elles existent

        setNodes(nodesData);
        setEdges(edgesData);
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération des tables :', error);
      })
      .finally(() => setLoading(false));
  }, []);

  // Gestion des changements des nœuds
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Gestion des changements des connexions
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  if (loading) {
    return <div>Chargement des données...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100vh', border: '1px solid black' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
