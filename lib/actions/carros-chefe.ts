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
// Format: tipo de joia × subtipo × pedra × lapidação
export const CC_DEFAULTS: CarroChefeInput[] = [
  { label: 'Anel Solitário · Diamante Brilhante',       produto: 'ANEL SOLITÁRIO',   subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',          lapidacao: 'BRILHANTE',    order: 1  },
  { label: 'Brinco Solitário · Diamante Brilhante',     produto: 'BRINCO SOLITÁRIO', subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',          lapidacao: 'BRILHANTE',    order: 2  },
  { label: 'Ponto de Luz · Sol. Diamante Brilhante',    produto: 'PONTO DE LUZ',     subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',          lapidacao: 'BRILHANTE',    order: 3  },
  { label: 'Aliança Riviera · Diamante Brilhante',      produto: 'ALIANÇA RIVIERA',  subtipo: 'RIVIERA',      tipo_pedra: 'DIAMANTE',          lapidacao: 'BRILHANTE',    order: 4  },
  { label: 'Meia Aliança · Diamante Brilhante',         produto: 'MEIA ALIANÇA',     subtipo: 'MEIA ALIANÇA', tipo_pedra: 'DIAMANTE',          lapidacao: 'BRILHANTE',    order: 5  },
  { label: 'Anel Maracanã · Esmeralda Retangular',      produto: 'ANEL',             subtipo: 'MARACANÃ',     tipo_pedra: 'ESMERALDA',         lapidacao: 'RETANGULAR',   order: 6  },
  { label: 'Ponto de Luz · Diamante Brilhante',         produto: 'PONTO DE LUZ',     subtipo: 'PONTO DE LUZ', tipo_pedra: 'DIAMANTE',          lapidacao: 'BRILHANTE',    order: 7  },
  { label: 'Pulseira Riviera · Diamante Brilhante',     produto: 'PULSEIRA RIVIERA', subtipo: 'RIVIERA',      tipo_pedra: 'DIAMANTE',          lapidacao: 'BRILHANTE',    order: 8  },
  { label: 'Colar Riviera Ilusion · Diamante',          produto: 'COLAR RIVIERA',    subtipo: 'ILUSION',      tipo_pedra: 'DIAMANTE',          lapidacao: 'DIVERSAS',     order: 9  },
  { label: 'Pingente P/Riviera · Esmeralda Gota',       produto: 'PINGENTE',         subtipo: 'PARA RIVIERA', tipo_pedra: 'ESMERALDA',         lapidacao: 'GOTA',         order: 10 },
  { label: 'Ponto de Luz · Sol. Old Mine',              produto: 'PONTO DE LUZ',     subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',          lapidacao: 'OLD MINE',     order: 11 },
  { label: 'Brinco Cravejado · Diamante Brilhante',     produto: 'BRINCO',           subtipo: 'CRAVEJADO',    tipo_pedra: 'DIAMANTE',          lapidacao: 'BRILHANTE',    order: 12 },
  { label: 'Anel Solitário · Diamante Old European',    produto: 'ANEL SOLITÁRIO',   subtipo: 'SOLITÁRIO',    tipo_pedra: 'DIAMANTE',          lapidacao: 'OLD EUROPEAN', order: 13 },
  { label: 'Brinco Maracanã · Turmalina Paraíba Gota',  produto: 'BRINCO',           subtipo: 'MARACANÃ',     tipo_pedra: 'TURMALINA PARAÍBA', lapidacao: 'GOTA',         order: 14 },
  { label: 'Anel Maracanã · Esmeralda Quadrado',        produto: 'ANEL',             subtipo: 'MARACANÃ',     tipo_pedra: 'ESMERALDA',         lapidacao: 'QUADRADO',     order: 15 },
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
