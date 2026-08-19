'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useLeiloes, type Leilao } from '@/lib/hooks/use-leiloes';
import { LeilaoCalendar } from '@/components/leilao/leilao-calendar';
import { LeilaoModal, type LeilaoFormValues } from '@/components/leilao/leilao-modal';

export default function LeilaoPage() {
  const { leiloes, add, update, remove } = useLeiloes();
  const [modalOpen,    setModalOpen]   = useState(false);
  const [editing,      setEditing]     = useState<Leilao | undefined>();
  const [defaultDate,  setDefaultDate] = useState<string | undefined>();

  function handleAdd(date?: string) {
    setEditing(undefined);
    setDefaultDate(date);
    setModalOpen(true);
  }

  function handleEdit(leilao: Leilao) {
    setEditing(leilao);
    setDefaultDate(undefined);
    setModalOpen(true);
  }

  function handleClose() {
    setModalOpen(false);
    setEditing(undefined);
    setDefaultDate(undefined);
  }

  function handleSave(values: LeilaoFormValues & { cor: string }) {
    const normalized = {
      ...values,
      numero:          values.numero          ?? '',
      codigoPlatforma: values.codigoPlatforma ?? '',
    };
    if (editing) {
      update({ ...editing, ...normalized });
      toast.success('Leilão atualizado');
    } else {
      add(normalized);
      toast.success('Leilão adicionado ao calendário');
    }
    handleClose();
  }

  function handleDelete() {
    if (!editing) return;
    remove(editing.id);
    toast.success('Leilão removido');
    handleClose();
  }


  const modalInitial: Partial<Leilao> | undefined = editing
    ?? (defaultDate ? { dataInicio: defaultDate, dataFim: defaultDate } : undefined);

  return (
    <div className="h-full overflow-hidden p-3 sm:p-6 flex flex-col">
      <LeilaoCalendar leiloes={leiloes} onAdd={handleAdd} onEdit={handleEdit} />
      <LeilaoModal
        open={modalOpen}
        onClose={handleClose}
        onSave={handleSave}
        onDelete={editing ? handleDelete : undefined}
        initial={modalInitial}
      />
    </div>
  );
}
