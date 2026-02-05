export function addBusinessDays(start: Date, days: number) {
  let remaining = Math.max(0, Math.floor(days));
  const d = new Date(start);
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0 Sun .. 6 Sat
    if (day !== 0 && day !== 6) remaining--;
  }
  return d;
}

