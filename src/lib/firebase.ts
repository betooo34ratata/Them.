import { useState, useEffect } from 'react';

// --- Types ---
export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
}

// --- Local Storage Helpers ---
const STORAGE_KEY = 'lumi_ai_mock_db';

const getDb = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  const defaults = { 
    users: {}, 
    authUsers: {}, 
    schools: {}, 
    submissions: [], 
    classes: [], 
    notifications: [], 
    homeworks: [], 
    quizzes: [], 
    tickets: [], 
    announcements: [] 
  };
  
  if (!data) return defaults;
  
  const parsed = JSON.parse(data);
  return { ...defaults, ...parsed };
};

const saveDb = (db: any) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.message?.includes('quota') || error.code === 22) {
      console.warn('Storage quota exceeded. Cleanup is triggered for older submissions containing base64 data.');
      
      // 1. Strip heavy base64 imageData from homework submissions older than the 3 most recent ones
      if (db.submissions && Array.isArray(db.submissions)) {
        const sorted = [...db.submissions].sort((a: any, b: any) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA; // most recent first
        });

        let clearedCount = 0;
        db.submissions = db.submissions.map((sub: any) => {
          const rank = sorted.findIndex((s: any) => s.id === sub.id);
          // If the submission is not in the top 3 and has an image, clear the image base64 string
          if (rank > 2 && sub.imageUrl) {
            clearedCount++;
            return { ...sub, imageUrl: null };
          }
          return sub;
        });

        console.warn(`Cleared heavy base64 images from ${clearedCount} older submissions.`);
      }

      // Try saving again
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        window.dispatchEvent(new Event('storage_update'));
        return;
      } catch (retryError) {
        console.warn('Clearing old image base64 streams was not enough. Performing strict data trimming...');
      }

      // 2. If it still fails, keep only the 15 most recent submissions to prevent crash
      if (db.submissions && Array.isArray(db.submissions) && db.submissions.length > 15) {
        const sorted = [...db.submissions].sort((a: any, b: any) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        const keepIds = new Set(sorted.slice(0, 15).map((s: any) => s.id));
        const originalLength = db.submissions.length;
        db.submissions = db.submissions.filter((sub: any) => keepIds.has(sub.id));
        console.warn(`Trimmed submission logs count from ${originalLength} to ${db.submissions.length}`);
      }

      // Also limit notifications and action logs
      if (db.notifications && Array.isArray(db.notifications) && db.notifications.length > 20) {
        db.notifications = db.notifications.slice(-20);
      }

      // Try saving again after deep trim
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      } catch (finalError) {
        console.error('Core localDB remains full after deep compression. Carrying out emergency DB reset.', finalError);
        // Fallback fallback: clean up submissions entirely to let users function
        db.submissions = [];
        db.notifications = [];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        } catch (e) {
          console.error('Fatal LocalStorage limits exceeded.', e);
        }
      }
    } else {
      console.error('Non-quota Storage setItem failure:', error);
    }
  }
  // Notify other tabs/hooks
  window.dispatchEvent(new Event('storage_update'));
};

// --- Mock Auth ---
export const auth = {
  signOut: () => {
    localStorage.removeItem('lumi_ai_user');
    window.dispatchEvent(new Event('auth_update'));
  }
};

export const useAuthState = (authObj: any) => {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const stored = localStorage.getItem('lumi_ai_user');
      setUser(stored ? JSON.parse(stored) : null);
      setLoading(false);
    };

    checkAuth();
    window.addEventListener('auth_update', checkAuth);
    return () => window.removeEventListener('auth_update', checkAuth);
  }, []);

  return [user, loading] as const;
};

export const createUserWithEmailAndPassword = async (authObj: any, emailInput: string, pass: string, displayName: string = '') => {
  const email = emailInput.toLowerCase();
  const dbData = getDb();
  if (dbData.authUsers[email]) {
    throw new Error('Acest email este deja utilizat.');
  }

  const uid = 'local_' + Math.random().toString(36).substr(2, 9);
  dbData.authUsers[email] = { password: pass, uid, displayName };
  saveDb(dbData);

  const mockUser: MockUser = {
    uid,
    email,
    displayName: displayName || email.split('@')[0]
  };

  localStorage.setItem('lumi_ai_user', JSON.stringify(mockUser));
  window.dispatchEvent(new Event('auth_update'));
  return { user: mockUser };
};

export const signInWithEmailAndPassword = async (authObj: any, emailInput: string, pass: string) => {
  const email = emailInput.toLowerCase();
  const dbData = getDb();
  const authUser = dbData.authUsers[email];

  if (!authUser || authUser.password !== pass) {
    throw new Error('Email sau parolă incorectă.');
  }

  const mockUser: MockUser = {
    uid: authUser.uid,
    email,
    displayName: authUser.displayName || email.split('@')[0]
  };

  localStorage.setItem('lumi_ai_user', JSON.stringify(mockUser));
  window.dispatchEvent(new Event('auth_update'));
  return { user: mockUser };
};

export const signInWithGoogle = async () => {
  // Simple prompt-based mock login
  const name = prompt('Introdu numele tău pe Them:') || 'Utilizator';
  const roleInput = prompt('Ce rol dorești? (E = Elev, P = Profesor, D = Director)', 'E')?.toUpperCase();
  
  let role: 'student' | 'teacher' | 'director' = 'student';
  if (roleInput === 'P') role = 'teacher';
  else if (roleInput === 'D') role = 'director';
  
  const mockUser: MockUser = {
    uid: 'local_' + Math.random().toString(36).substr(2, 9),
    email: name.toLowerCase().replace(/\s+/g, '.') + '@them.local',
    displayName: name
  };
  
  // Initialize profile in mock DB
  const dbData = getDb();
  dbData.users[mockUser.uid] = {
    uid: mockUser.uid,
    name: name,
    email: mockUser.email,
    role: role,
    points: 0,
    level: 1,
    badges: [],
    streak: 0,
    teacherSubject: role === 'teacher' ? 'Matematică' : undefined,
    schoolId: 'school_1'
  };
  
  // Also ensure school exists
  if (!dbData.schools['school_1']) {
    dbData.schools['school_1'] = {
      id: 'school_1',
      name: 'Liceul Teoretic "Them"',
      directorId: role === 'director' ? mockUser.uid : 'director_1'
    };
  } else if (role === 'director') {
    dbData.schools['school_1'].directorId = mockUser.uid;
  }

  saveDb(dbData);
  
  localStorage.setItem('lumi_ai_user', JSON.stringify(mockUser));
  window.dispatchEvent(new Event('auth_update'));
  return { user: mockUser };
};

// --- Mock Firestore ---
export const db = {};

export const doc = (db: any, collectionName: string, id: string) => ({ collectionName, id });
export const collection = (db: any, name: string) => ({ collectionName: name });
export const query = (col: any, ...constraints: any[]) => ({ ...col, constraints });
export const where = (field: string, op: string, value: any) => ({ field, op, value });
export const orderBy = (field: string, dir: string = 'asc') => ({ type: 'orderBy', field, dir });
export const limit = (n: number) => ({ type: 'limit', n });

export const getDoc = async (docRef: any) => {
  const db = getDb();
  const data = db[docRef.collectionName]?.[docRef.id];
  return {
    id: docRef.id,
    exists: () => !!data,
    data: () => data || null
  };
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  const db = getDb();
  if (!db[docRef.collectionName]) db[docRef.collectionName] = {};
  
  if (options?.merge) {
    db[docRef.collectionName][docRef.id] = { ...db[docRef.collectionName][docRef.id], ...data };
  } else {
    db[docRef.collectionName][docRef.id] = data;
  }
  
  saveDb(db);
};

export const updateDoc = async (docRef: any, data: any) => {
  const db = getDb();
  const collection = db[docRef.collectionName];
  
  if (collection && collection[docRef.id]) {
    const currentData = collection[docRef.id];
    const newData = { ...currentData };
    
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'function') {
        newData[key] = data[key](currentData[key]);
      } else {
        newData[key] = data[key];
      }
    });

    db[docRef.collectionName][docRef.id] = newData;
    saveDb(db);
  } else if (Array.isArray(collection)) {
    const idx = collection.findIndex((item: any) => item.id === docRef.id);
    if (idx !== -1) {
      const currentData = collection[idx];
      const newData = { ...currentData };
      
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'function') {
          newData[key] = data[key](currentData[key]);
        } else {
          newData[key] = data[key];
        }
      });
      
      db[docRef.collectionName][idx] = newData;
      saveDb(db);
    }
  }
};

export const addDoc = async (colRef: any, data: any) => {
  const db = getDb();
  const id = 'id_' + Date.now() + Math.random().toString(36).substr(2, 5);
  const newItem = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };

  if (Array.isArray(db[colRef.collectionName])) {
    db[colRef.collectionName].push(newItem);
  } else {
    // If it's an object store (like 'users')
    if (!db[colRef.collectionName]) db[colRef.collectionName] = {};
    db[colRef.collectionName][id] = newItem;
  }
  
  saveDb(db);
  return { id };
};

export const deleteDoc = async (docRef: any) => {
    const db = getDb();
    if (Array.isArray(db[docRef.collectionName])) {
        db[docRef.collectionName] = db[docRef.collectionName].filter((item: any) => item.id !== docRef.id);
    } else if (db[docRef.collectionName]) {
        delete db[docRef.collectionName][docRef.id];
    }
    saveDb(db);
};

const applyConstraints = (items: any[], q: any) => {
  let filtered = [...items];
  if (!q.constraints) return filtered;

  // 1. Where filters
  q.constraints.forEach((c: any) => {
    if (c.field && c.op === '==') {
      filtered = filtered.filter((item: any) => item[c.field] === c.value);
    }
    if (c.field && c.op === 'array-contains') {
      filtered = filtered.filter((item: any) => Array.isArray(item[c.field]) && item[c.field].includes(c.value));
    }
  });

  // 2. Order by filters
  const orderByConstraint = q.constraints.find((c: any) => c.type === 'orderBy');
  if (orderByConstraint) {
    const { field, dir } = orderByConstraint;
    filtered.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      // Handle strings, numbers, dates
      const compareResult = (typeof valA === 'string' && typeof valB === 'string')
        ? valA.localeCompare(valB)
        : (valA < valB ? -1 : valA > valB ? 1 : 0);

      return dir === 'desc' ? -compareResult : compareResult;
    });
  }

  // 3. Limit filters
  const limitConstraint = q.constraints.find((c: any) => c.type === 'limit');
  if (limitConstraint) {
    filtered = filtered.slice(0, limitConstraint.n);
  }

  return filtered;
};

export const onSnapshot = (docRef: any, callback: (snap: any) => void) => {
  const handler = async () => {
    const snap = await getDoc(docRef);
    callback(snap);
  };
  
  handler();
  window.addEventListener('storage_update', handler);
  return () => window.removeEventListener('storage_update', handler);
};

export const useCollectionData = (q: any, options?: any) => {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
        setData(null);
        setLoading(false);
        return;
    }

    const fetchData = () => {
      const dbData = getDb();
      let items: any[] = [];
      
      const raw = dbData[q.collectionName];
      if (Array.isArray(raw)) {
        items = [...raw];
      } else if (typeof raw === 'object' && raw !== null) {
        items = Object.values(raw);
      }

      items = applyConstraints(items, q);

      // Handle idField option if provided
      if (options?.idField) {
          items = items.map(item => {
              if (item.id && options.idField === 'id') return item;
              return { ...item, [options.idField]: item.id };
          });
      }

      setData(items);
      setLoading(false);
    };

    fetchData();
    window.addEventListener('storage_update', fetchData);
    return () => window.removeEventListener('storage_update', fetchData);
  }, [q?.collectionName, JSON.stringify(q?.constraints)]);

  return [data, loading, null] as const;
};

export const getDocs = async (q: any) => {
    const dbData = getDb();
    let items: any[] = [];
    const raw = dbData[q.collectionName];
    if (Array.isArray(raw)) {
      items = [...raw];
    } else if (typeof raw === 'object' && raw !== null) {
      items = Object.values(raw);
    }

    items = applyConstraints(items, q);

    return {
        docs: items.map(item => ({
            id: item.id || 'id',
            data: () => item
        })),
        empty: items.length === 0
    };
};

export const serverTimestamp = () => new Date().toISOString();

export const arrayUnion = (val: any) => (prev: any[]) => {
    const arr = Array.isArray(prev) ? prev : [];
    if (arr.includes(val)) return arr;
    return [...arr, val];
};

export const increment = (val: number) => (prev?: number) => (prev || 0) + val;
