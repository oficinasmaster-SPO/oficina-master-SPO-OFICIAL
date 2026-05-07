import { useEffect, useRef } from 'react';

const DB_NAME = 'OficinasMaster';
const DB_VERSION = 1;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

let dbInstance = null;

const initDB = async () => {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Cria object stores se não existirem
      ['followups', 'sprints', 'attendances', 'atas'].forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
  });
};

export const useIndexedDBCache = () => {
  const dbRef = useRef(null);

  useEffect(() => {
    initDB().then(db => {
      dbRef.current = db;
    }).catch(err => console.error('Erro ao inicializar IndexedDB:', err));
  }, []);

  const getCachedData = async (storeName, key) => {
    if (!dbRef.current) return null;

    return new Promise((resolve) => {
      try {
        const tx = dbRef.current.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const data = request.result;
          
          // Verifica se cache expirou
          if (data && data.cachedAt && Date.now() - data.cachedAt > CACHE_DURATION) {
            resolve(null);
          } else {
            resolve(data);
          }
        };

        request.onerror = () => resolve(null);
      } catch (err) {
        console.error('Erro ao buscar cache:', err);
        resolve(null);
      }
    });
  };

  const setCachedData = async (storeName, key, data) => {
    if (!dbRef.current) return;

    return new Promise((resolve) => {
      try {
        const tx = dbRef.current.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        const cacheEntry = {
          id: key,
          data,
          cachedAt: Date.now(),
        };

        const request = store.put(cacheEntry);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (err) {
        console.error('Erro ao salvar cache:', err);
        resolve(false);
      }
    });
  };

  const clearCache = async (storeName) => {
    if (!dbRef.current) return;

    return new Promise((resolve) => {
      try {
        const tx = dbRef.current.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (err) {
        console.error('Erro ao limpar cache:', err);
        resolve(false);
      }
    });
  };

  return { getCachedData, setCachedData, clearCache };
};