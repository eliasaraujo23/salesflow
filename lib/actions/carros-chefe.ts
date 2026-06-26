import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, writeBatch, getDocs, query, orderBy,
} from 'firebase/firestore';

export interface CarroChefeDef {
  id: string;
  label: string;
  produto: string;    // includes() match on produto field; empty = no filter
  subtipo: string;    // exact match on subtipo; empty = no filter
  tipo_pedra: string; // exact match; empty = no filter
  lapidacao: string;  // exact match; empty = no filter
  order: number;
}

export type CarroChefeInput = Omit<CarroChefeDef, 'id'>;

const COL = 'carros_chefe';

// Derived from full sales history (JF vendidos mar/2022–jun/2026)
// Grouping: tipo de joia × subtipo × pedra (lapidação not used — any lapidação qualifies)
// Status: VENDIDO E PAGO (2) + AGUARDANDO PAGAMENTO (4) + VENDIDO PARCELADO (13)
export const CC_DEFAULTS: CarroChefeInput[] = [
  { label: 'Anel Solitário · Diamante',                produto: 'ANEL SOLITÁRIO',   subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 1  },
  { label: 'Brinco Solitário · Diamante',              produto: 'BRINCO SOLITÁRIO', subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 2  },
  { label: 'Ponto de Luz Solitário · Diamante',        produto: 'PONTO DE LUZ',     subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 3  },
  { label: 'Anel Maracanã · Esmeralda',                produto: 'ANEL',             subtipo: 'MARACANÃ',     tipo_pedra: 'ESMERALDA',           lapidacao: '', order: 4  },
  { label: 'Meia Aliança · Diamante',                  produto: 'MEIA ALIANÇA',     subtipo: 'MEIA ALIANÇA', tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 5  },
  { label: 'Aliança Riviera · Diamante',               produto: 'ALIANÇA RIVIERA',  subtipo: 'RIVIERA',      tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 6  },
  { label: 'Ponto de Luz · Diamante',                  produto: 'PONTO DE LUZ',     subtipo: 'PONTO DE LUZ', tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 7  },
  { label: 'Brinco Maracanã · Esmeralda',              produto: 'BRINCO',           subtipo: 'MARACANÃ',     tipo_pedra: 'ESMERALDA',           lapidacao: '', order: 8  },
  { label: 'Colar Riviera Ilusion · Diamante',         produto: 'COLAR RIVIERA',    subtipo: 'ILUSION',      tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 9  },
  { label: 'Pulseira Riviera · Diamante',              produto: 'PULSEIRA RIVIERA', subtipo: 'RIVIERA',      tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 10 },
  { label: 'Pingente P/Riviera · Esmeralda',           produto: 'PINGENTE',         subtipo: 'PARA RIVIERA', tipo_pedra: 'ESMERALDA',           lapidacao: '', order: 11 },
  { label: 'Anel Maracanã · Turmalina Paraíba',        produto: 'ANEL',             subtipo: 'MARACANÃ',     tipo_pedra: 'TURMALINA PARAÍBA',   lapidacao: '', order: 12 },
  { label: 'Brinco Maracanã · Turmalina Paraíba',      produto: 'BRINCO',           subtipo: 'MARACANÃ',     tipo_pedra: 'TURMALINA PARAÍBA',   lapidacao: '', order: 13 },
  { label: 'Anel Cravejado · Diamante',                produto: 'ANEL',             subtipo: 'CRAVEJADO',    tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 14 },
  { label: 'Colar Maracanã · Esmeralda',               produto: 'COLAR',            subtipo: 'MARACANÃ',     tipo_pedra: 'ESMERALDA',           lapidacao: '', order: 15 },
  { label: 'Anel Maracanã · Esmeralda Colombiana',     produto: 'ANEL',             subtipo: 'MARACANÃ',     tipo_pedra: 'ESMERALDA COLOMBIANA', lapidacao: '', order: 16 },
  { label: 'Pulseira Riviera Ilusion · Diamante',      produto: 'PULSEIRA RIVIERA', subtipo: 'ILUSION',      tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 17 },
  { label: 'Brinco Cravejado · Diamante',              produto: 'BRINCO',           subtipo: 'CRAVEJADO',    tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 18 },
  { label: 'Brinco Ear Cuff · Diamante',               produto: 'BRINCO EAR CUFF',  subtipo: 'EAR CUFF',     tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 19 },
  { label: 'Pingente Solitário · Esmeralda',           produto: 'PINGENTE',         subtipo: 'SOLITÁRIO',    tipo_pedra: 'ESMERALDA',           lapidacao: '', order: 20 },
  { label: 'Pingente Solitário · Diamante',            produto: 'PINGENTE',         subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 21 },
  { label: 'Brinco Maracanã · Esmeralda Colombiana',  produto: 'BRINCO',           subtipo: 'MARACANÃ',     tipo_pedra: 'ESMERALDA COLOMBIANA', lapidacao: '', order: 22 },
  { label: 'Colar Riviera Faca · Diamante',            produto: 'COLAR RIVIERA',    subtipo: 'FACA',         tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 23 },
  { label: 'Colar Maracanã · Turmalina Paraíba',       produto: 'COLAR',            subtipo: 'MARACANÃ',     tipo_pedra: 'TURMALINA PARAÍBA',   lapidacao: '', order: 24 },
  { label: 'Pingente P/Luz · Diamante',                produto: 'PINGENTE',         subtipo: 'PONTO DE LUZ', tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 25 },
  { label: 'Colar Cravejado · Diamante',               produto: 'COLAR',            subtipo: 'CRAVEJADO',    tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 26 },
  { label: 'Aliança Riviera Voltinha · Diamante',      produto: 'ALIANÇA RIVIERA',  subtipo: 'VOLTINHA',     tipo_pedra: 'DIAMANTE',            lapidacao: '', order: 27 },
  { label: 'Anel Cravejado · Esmeralda',               produto: 'ANEL',             subtipo: 'CRAVEJADO',    tipo_pedra: 'ESMERALDA',           lapidacao: '', order: 28 },
  { label: 'Pingente P/Riviera · Esm. Colombiana',     produto: 'PINGENTE',         subtipo: 'PARA RIVIERA', tipo_pedra: 'ESMERALDA COLOMBIANA', lapidacao: '', order: 29 },
  { label: 'Anel Maracanã Duplo · Esmeralda',          produto: 'ANEL',             subtipo: 'MARACANÃ DUPLO', tipo_pedra: 'ESMERALDA',         lapidacao: '', order: 30 },
];

export async function addCarroChefeAction(data: CarroChefeInput): Promise<void> {
  await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() });
}

export async function updateCarroChefeAction(id: string, data: Partial<CarroChefeInput>): Promise<void> {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteCarroChefeAction(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function seedDefaultsAction(): Promise<void> {
  const snap = await getDocs(query(collection(db, COL), orderBy('order')));
  if (!snap.empty) return; // only seed if collection is truly empty
  const batch = writeBatch(db);
  CC_DEFAULTS.forEach(def => {
    batch.set(doc(collection(db, COL)), { ...def, createdAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function resetDefaultsAction(): Promise<void> {
  const snap = await getDocs(collection(db, COL));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  CC_DEFAULTS.forEach(def => {
    batch.set(doc(collection(db, COL)), { ...def, createdAt: serverTimestamp() });
  });
  await batch.commit();
}
