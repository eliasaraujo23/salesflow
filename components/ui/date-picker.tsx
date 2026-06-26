/**
 * DatePicker — componente unificado de data para novas telas
 *
 * ── Importação ────────────────────────────────────────────────────────────────
 *   import { DatePicker } from '@/components/ui/date-picker';
 *   import { DatePicker, type DateRangeValue } from '@/components/ui/date-picker';
 *
 * ── Data única (mode="single" ou omitido) ─────────────────────────────────────
 *
 *   Com react-hook-form:
 *     const schema = z.object({ data: z.string().min(1, 'Obrigatório') });
 *     <Controller
 *       name="data"
 *       control={control}
 *       render={({ field }) => (
 *         <DatePicker value={field.value ?? ''} onChange={field.onChange} />
 *       )}
 *     />
 *
 *   Sem react-hook-form:
 *     const [data, setData] = useState('');
 *     <DatePicker value={data} onChange={setData} />
 *
 * ── Intervalo (mode="range") ──────────────────────────────────────────────────
 *
 *   Com react-hook-form:
 *     const schema = z.object({
 *       periodo: z.object({ from: z.string().min(1), to: z.string().min(1) }),
 *     });
 *     <Controller
 *       name="periodo"
 *       control={control}
 *       render={({ field }) => (
 *         <DatePicker
 *           mode="range"
 *           value={field.value ?? { from: '', to: '' }}
 *           onChange={field.onChange}
 *         />
 *       )}
 *     />
 *
 *   Sem react-hook-form:
 *     const [periodo, setPeriodo] = useState<DateRangeValue>({ from: '', to: '' });
 *     <DatePicker mode="range" value={periodo} onChange={setPeriodo} />
 *
 * ── Valores emitidos ─────────────────────────────────────────────────────────
 *   single → string 'yyyy-mm-dd' ou '' (vazio, compatível com input[type=date])
 *   range  → { from: 'yyyy-mm-dd', to: 'yyyy-mm-dd' } ('' quando não selecionado)
 *
 * ── Props adicionais ─────────────────────────────────────────────────────────
 *   placeholder?    — texto exibido quando vazio
 *   disabled?       — desativa o campo
 *   className?      — classe extra para o botão trigger
 *   clearable?      — (single only) exibe botão X para limpar. Padrão: true
 *   numberOfMonths? — (range only) 1 ou 2. Padrão: 2 no desktop, 1 em mobile
 */
'use client';

import { SingleDatePicker } from '@/components/ui/single-date-picker';
import { RangeDatePicker, type DateRangeValue } from '@/components/ui/range-date-picker';

export type { DateRangeValue };

interface SharedProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface SingleMode extends SharedProps {
  mode?: 'single';
  value: string;
  onChange: (value: string) => void;
  clearable?: boolean;
}

interface RangeMode extends SharedProps {
  mode: 'range';
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  numberOfMonths?: 1 | 2;
}

export type DatePickerProps = SingleMode | RangeMode;

export function DatePicker(props: DatePickerProps) {
  if (props.mode === 'range') {
    return (
      <RangeDatePicker
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        disabled={props.disabled}
        numberOfMonths={props.numberOfMonths}
        className={props.className}
      />
    );
  }
  return (
    <SingleDatePicker
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      disabled={props.disabled}
      clearable={props.clearable}
      className={props.className}
    />
  );
}
