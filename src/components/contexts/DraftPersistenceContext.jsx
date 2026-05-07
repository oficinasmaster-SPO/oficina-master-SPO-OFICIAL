import React, { createContext, useContext, useEffect, useState } from 'react';

const DraftPersistenceContext = createContext();

export const DraftPersistenceProvider = ({ children }) => {
  const [drafts, setDrafts] = useState({});

  // Carrega rascunhos do localStorage no mount
  useEffect(() => {
    const stored = localStorage.getItem('drafts_atendimentos');
    if (stored) {
      try {
        setDrafts(JSON.parse(stored));
      } catch (err) {
        console.error('Erro ao carregar rascunhos:', err);
      }
    }
  }, []);

  // Salva rascunhos no localStorage sempre que muda
  useEffect(() => {
    localStorage.setItem('drafts_atendimentos', JSON.stringify(drafts));
  }, [drafts]);

  const saveDraft = (followUpId, data) => {
    setDrafts(prev => ({
      ...prev,
      [followUpId]: {
        ...data,
        savedAt: new Date().toISOString(),
      }
    }));
  };

  const getDraft = (followUpId) => drafts[followUpId] || null;

  const clearDraft = (followUpId) => {
    setDrafts(prev => {
      const updated = { ...prev };
      delete updated[followUpId];
      return updated;
    });
  };

  const clearAllDrafts = () => setDrafts({});

  return (
    <DraftPersistenceContext.Provider value={{ drafts, saveDraft, getDraft, clearDraft, clearAllDrafts }}>
      {children}
    </DraftPersistenceContext.Provider>
  );
};

export const useDraftPersistence = () => {
  const ctx = useContext(DraftPersistenceContext);
  if (!ctx) throw new Error('useDraftPersistence deve estar dentro de DraftPersistenceProvider');
  return ctx;
};