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

export const CC_DEFAULTS: CarroChefeInput[] = [
  { label: 'Anel Solitário',      produto: 'ANEL',            subtipo: 'SOLITÁRIO',    tipo_pedra: '', lapidacao: '', order: 1 },
  { label: 'Brinco Solitário',    produto: 'BRINCO',          subtipo: 'SOLITÁRIO',    tipo_pedra: '', lapidacao: '', order: 2 },
  { label: 'Ponto de Luz',        produto: '',                subtipo: 'PONTO DE LUZ', tipo_pedra: '', lapidacao: '', order: 3 },
  { label: 'Meia Aliança',        produto: '',                subtipo: 'MEIA ALIANÇA', tipo_pedra: '', lapidacao: '', order: 4 },
  { label: 'Colar Riviera',       produto: 'COLAR',           subtipo: 'RIVIERA',      tipo_pedra: '', lapidacao: '', order: 5 },
  { label: 'Pulseira Riviera',    produto: 'PULSEIRA',        subtipo: 'RIVIERA',      tipo_pedra: '', lapidacao: '', order: 6 },
  { label: 'Aliança Riviera',     produto: 'ALIANÇA RIVIERA', subtipo: '',             tipo_pedra: '', lapidacao: '', order: 7 },
  { label: 'Anel Maracanã',       produto: 'ANEL',            subtipo: 'MARACANÃ',     tipo_pedra: '', lapidacao: '', order: 8 },
  { label: 'Colar Maracanã',      produto: 'COLAR',           subtipo: 'MARACANÃ',     tipo_pedra: '', lapidacao: '', order: 9 },
  { label: 'Brinco Maracanã',     produto: 'BRINCO',          subtipo: 'MARACANÃ',     tipo_pedra: '', lapidacao: '', order: 10 },
  { label: 'Pingente P/ Riviera', produto: 'PINGENTE',        subtipo: 'PARA RIVIERA', tipo_pedra: '', lapidacao: '', order: 11 },
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
