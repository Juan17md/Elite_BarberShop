import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getLocalDateString(date: Date = new Date()): string {
  // Aseguramos el formato YYYY-MM-DD para America/Caracas sin depender de en-CA
  const d = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = d.find(p => p.type === "year")?.value;
  const month = d.find(p => p.type === "month")?.value;
  const day = d.find(p => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function getStartOfWeekString(date: Date = new Date()): string {
  // Encontrar el domingo anterior usando la hora de Venezuela de forma robusta
  const caracasDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Caracas" }));
  const diff = caracasDate.getDay(); // 0 es Domingo
  const sunday = new Date(caracasDate);
  sunday.setDate(caracasDate.getDate() - diff);
  return getLocalDateString(sunday);
}


export function getStartOfMonthString(date: Date = new Date()): string {
  const result = getLocalDateString(date);
  return `${result.substring(0, 7)}-01`;
}

export interface Period {
  inicio: string;
  fin: string;
  label: string;
  isSunday: boolean;
}



function formatFecha(date: Date): string {
  const d = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas",
      day: "2-digit",
    }).format(date)
  );
  const m = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    month: "short",
  }).format(date);
  const y = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
  }).format(date);
  return `${d} ${m} ${y}`;
}

export function getPeriodFromPosition(position: number = 0): Period {
  const hoy = new Date();
  const fechaCaracas = new Date(
    hoy.toLocaleString("en-US", { timeZone: "America/Caracas" })
  );
  const diaSemana = fechaCaracas.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  const hoyEsDomingo = diaSemana === 0;

  // En domingo, posición 0 = hoy (domingo actual)
  if (hoyEsDomingo && position === 0) {
    const dateStr = getLocalDateString(fechaCaracas);
    return {
      inicio: dateStr,
      fin: dateStr,
      label: `Domingo ${formatFecha(fechaCaracas)}`,
      isSunday: true,
    };
  }

  // Ajustar posición si hoy es domingo (posición 0 ya se usó para hoy)
  const pos = hoyEsDomingo ? position - 1 : position;
  const lunesActual = (() => {
    const diff = hoyEsDomingo ? -6 : -(diaSemana - 1);
    const l = new Date(fechaCaracas);
    l.setDate(fechaCaracas.getDate() + diff);
    return l;
  })();

  const esDomingo = pos % 2 === 1;
  const pasosAtras = Math.floor(pos / 2);

  if (esDomingo) {
    const domingo = new Date(lunesActual);
    domingo.setDate(lunesActual.getDate() - (pasosAtras * 7 + 1));
    const dateStr = getLocalDateString(domingo);
    return {
      inicio: dateStr,
      fin: dateStr,
      label: `Domingo ${formatFecha(domingo)}`,
      isSunday: true,
    };
  }

  const lunes = new Date(lunesActual);
  lunes.setDate(lunesActual.getDate() - pasosAtras * 7);
  const sabado = new Date(lunes);
  sabado.setDate(lunes.getDate() + 5);

  return {
    inicio: getLocalDateString(lunes),
    fin: getLocalDateString(sabado),
    label: `${formatFecha(lunes)} – ${formatFecha(sabado)}`,
    isSunday: false,
  };
}
