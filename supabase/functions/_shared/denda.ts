export interface TarifDenda {
  nominal_per_hari: number;
  berlaku_mulai_tanggal: string; // YYYY-MM-DD
}

export function calculateDenda(
  jatuh_tempo: string, // YYYY-MM-DD
  tanggal_kembali: string | null, // YYYY-MM-DD
  tarif_history: TarifDenda[],
  today: string // YYYY-MM-DD (to evaluate active loans)
): number {
  const endDateStr = tanggal_kembali || today;
  if (endDateStr <= jatuh_tempo) return 0; // Not overdue

  // Sort tarif history descending by date
  const sortedTarif = [...tarif_history].sort((a, b) => 
    b.berlaku_mulai_tanggal.localeCompare(a.berlaku_mulai_tanggal)
  );

  let totalDenda = 0;
  
  // We need to iterate from jatuh_tempo + 1 day up to endDateStr
  // For each day, find the active tarif.
  // A more efficient approach for large intervals is to split by periods, but iterating by day is robust for small intervals.
  const start = new Date(jatuh_tempo);
  start.setDate(start.getDate() + 1); // Overdue starts day after jatuh_tempo
  const end = new Date(endDateStr);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split('T')[0];
    // Find the first tarif whose berlaku_mulai_tanggal <= dayStr
    const activeTarif = sortedTarif.find(t => t.berlaku_mulai_tanggal <= dayStr);
    if (activeTarif) {
      totalDenda += Number(activeTarif.nominal_per_hari);
    } else {
      // Fallback if no tarif found before this day (though there should be a default)
      // Usually there is a default from schema (500) at tenant creation
      const earliestTarif = sortedTarif[sortedTarif.length - 1];
      if (earliestTarif) {
        totalDenda += Number(earliestTarif.nominal_per_hari);
      }
    }
  }

  return totalDenda;
}
