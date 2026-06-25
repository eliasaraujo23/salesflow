export interface ParsedTask {
  id: string;
  title: string;
  person: string;
  priority: 'urgente' | 'alta' | 'media' | 'baixa';
  due: string;
  userMatched: boolean;
}

function normalize(str: string): string {
  return str.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function nextFriday(): string {
  const today = new Date();
  const day = today.getDay();
  let diff = (5 - day + 7) % 7;
  if (diff === 0) diff = 7;
  const fri = new Date(today);
  fri.setDate(today.getDate() + diff);
  return `${String(fri.getDate()).padStart(2, '0')}/${String(fri.getMonth() + 1).padStart(2, '0')}/${fri.getFullYear()}`;
}

function extractDate(text: string): { due: string; clean: string } {
  let due = nextFriday();
  let clean = text;

  // "até dd/mm/yyyy"
  const m4 = clean.match(/\bat[eé]\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (m4) {
    due = `${m4[1].padStart(2, '0')}/${m4[2].padStart(2, '0')}/${m4[3]}`;
    clean = clean.replace(m4[0], '').trim();
    return { due, clean };
  }

  // "até dd/mm"
  const m3 = clean.match(/\bat[eé]\s+(\d{1,2})\/(\d{1,2})/i);
  if (m3) {
    const year = new Date().getFullYear();
    due = `${m3[1].padStart(2, '0')}/${m3[2].padStart(2, '0')}/${year}`;
    clean = clean.replace(m3[0], '').trim();
    return { due, clean };
  }

  // "sem prazo" or "sem data"
  if (/sem\s+prazo|sem\s+data/i.test(clean)) {
    due = 'Sem prazo';
    clean = clean.replace(/sem\s+prazo|sem\s+data/ig, '').trim();
    return { due, clean };
  }

  // "até sexta", "próxima sexta", "essa semana", "amanhã"
  if (/\bat[eé]\s+(a\s+)?sexta|pr[oó]xima\s+sexta|essa\s+semana/i.test(clean)) {
    due = nextFriday();
    clean = clean.replace(/\bat[eé]\s+(a\s+)?sexta|pr[oó]xima\s+sexta|essa\s+semana/ig, '').trim();
  }

  return { due, clean };
}

function extractPriority(text: string): {
  priority: 'urgente' | 'alta' | 'media' | 'baixa';
  clean: string;
} {
  let clean = text;
  let priority: 'urgente' | 'alta' | 'media' | 'baixa' = 'media';

  if (/\(?\burgente\b\)?/i.test(clean)) {
    priority = 'urgente';
    clean = clean.replace(/\(?\burgente\b\)?/ig, '').trim();
  } else if (/\(?\balta\b\)?|\(?\bimportante\b\)?/i.test(clean)) {
    priority = 'alta';
    clean = clean.replace(/\(?\b(alta|importante)\b\)?/ig, '').trim();
  } else if (/\(?\bbaixa\b\)?/i.test(clean)) {
    priority = 'baixa';
    clean = clean.replace(/\(?\bbaixa\b\)?/ig, '').trim();
  }

  return { priority, clean };
}

export function parseMeetingText(
  text: string,
  users: { name: string }[],
): ParsedTask[] {
  const nameMap = new Map<string, string>();
  users.forEach(u => {
    nameMap.set(normalize(u.name), u.name);
    nameMap.set(normalize(u.name.split(' ')[0]), u.name);
  });

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tasks: ParsedTask[] = [];

  for (const line of lines) {
    // Skip blank section headers (e.g. "PAUTAS:", "Reunião 24/06:")
    if (/^[\s*•\-–]*[A-ZÁÉÍÓÚÂÊÔÃÕ][\s\w/:áéíóúâêôãõ]*:?\s*$/.test(line) && line.length < 40 && !line.match(/[:–\-].{5,}/)) continue;

    // Match "Name: task" or "Name - task", optionally prefixed with *, •, -
    const match = line.match(/^[*•\-–\s]*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{1,29}?)\s*[:–\-]\s*(.+)$/);
    if (!match) continue;

    const rawName = match[1].trim();
    const rawTask = match[2].trim();
    if (!rawTask || rawTask.length < 3) continue;

    const normalizedName = normalize(rawName);
    const resolvedName = nameMap.get(normalizedName) ?? rawName;
    const userMatched = nameMap.has(normalizedName);

    const { due, clean: afterDate } = extractDate(rawTask);
    const { priority, clean: afterPriority } = extractPriority(afterDate);

    const title = afterPriority
      .replace(/^\s*[,;.\-–]\s*/, '')
      .replace(/\s*[,;.]\s*$/, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!title) continue;

    tasks.push({
      id: `task-${tasks.length}-${rawName}`,
      title,
      person: resolvedName,
      priority,
      due,
      userMatched,
    });
  }

  return tasks;
}
