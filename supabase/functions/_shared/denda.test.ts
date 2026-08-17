import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { calculateDenda, TarifDenda } from "./denda.ts";

Deno.test("Calculate denda without overdue", () => {
  const tarif: TarifDenda[] = [{ nominal_per_hari: 500, berlaku_mulai_tanggal: "2023-01-01" }];
  const denda = calculateDenda("2023-10-10", "2023-10-09", tarif, "2023-10-10");
  assertEquals(denda, 0);
});

Deno.test("Calculate denda with single tarif", () => {
  const tarif: TarifDenda[] = [{ nominal_per_hari: 500, berlaku_mulai_tanggal: "2023-01-01" }];
  // Jatuh tempo 10, dikembalikan 12 (terlambat 2 hari: 11, 12)
  const denda = calculateDenda("2023-10-10", "2023-10-12", tarif, "2023-10-15");
  assertEquals(denda, 1000);
});

Deno.test("Calculate denda with tarif change in middle of overdue period", () => {
  const tarif: TarifDenda[] = [
    { nominal_per_hari: 500, berlaku_mulai_tanggal: "2023-10-01" }, // original tarif
    { nominal_per_hari: 1000, berlaku_mulai_tanggal: "2023-10-13" } // new tarif starts on 13th
  ];
  // Jatuh tempo: 10
  // Overdue days:
  // 11 -> 500
  // 12 -> 500
  // 13 -> 1000
  // 14 -> 1000
  // Dikembalikan: 14
  const denda = calculateDenda("2023-10-10", "2023-10-14", tarif, "2023-10-15");
  assertEquals(denda, 3000); // 500 + 500 + 1000 + 1000
});

Deno.test("Calculate denda active loan (not returned yet)", () => {
  const tarif: TarifDenda[] = [
    { nominal_per_hari: 500, berlaku_mulai_tanggal: "2023-10-01" },
    { nominal_per_hari: 1000, berlaku_mulai_tanggal: "2023-10-13" }
  ];
  // Jatuh tempo: 10
  // Overdue days (today is 13):
  // 11 -> 500
  // 12 -> 500
  // 13 -> 1000
  const denda = calculateDenda("2023-10-10", null, tarif, "2023-10-13");
  assertEquals(denda, 2000);
});
