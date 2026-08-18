import test from 'node:test';
import assert from 'node:assert/strict';

// Logic under test: sequential salinan generation
function generateSalinanCopies(buku, currentMaxNomorUrut, jumlahEksemplar) {
  if (jumlahEksemplar <= 0) return [];
  const prefix = buku.isbn || buku.kode_lokal || 'LOK-00001';
  const copies = [];
  for (let i = 1; i <= jumlahEksemplar; i++) {
    const nomorUrut = currentMaxNomorUrut + i;
    copies.push({
      buku_id: buku.id,
      nomor_urut: nomorUrut,
      kode_eksemplar: `${prefix}-${nomorUrut}`,
      status: 'tersedia'
    });
  }
  return copies;
}

// Logic under test: calculate book copies count for Buku List
function calculateBukuCopiesSummary(salinan) {
  const total = salinan.length;
  const tersedia = salinan.filter(s => s.status === 'tersedia').length;
  return {
    tersedia,
    total,
    formatted: `${tersedia}/${total}`,
    isGhostZero: total === 0
  };
}

// Logic under test: calculate total valid books for Dashboard (DASH-001)
function calculateDashboardTotalBuku(books) {
  return books.filter(b => !b.dihapus && b.salinan && b.salinan.length > 0).length;
}

// Logic under test: filter available salinan for Peminjaman
function filterAvailableSalinanForLoan(salinanList, activeTenantId) {
  return salinanList.filter(s => 
    s.status === 'tersedia' && 
    s.buku && 
    s.buku.tenant_id === activeTenantId && 
    !s.buku.dihapus
  );
}

test('BOOK-003 Root Cause Fix: Book 1 generates sequential copies properly', () => {
  const buku1 = { id: 'buku-1', isbn: '978-602-03-8591-4', kode_lokal: null };
  const copies = generateSalinanCopies(buku1, 0, 3);
  
  assert.equal(copies.length, 3);
  assert.equal(copies[0].kode_eksemplar, '978-602-03-8591-4-1');
  assert.equal(copies[1].kode_eksemplar, '978-602-03-8591-4-2');
  assert.equal(copies[2].kode_eksemplar, '978-602-03-8591-4-3');
  assert.equal(copies.every(c => c.status === 'tersedia'), true);
});

test('BOOK-003 Root Cause Fix: Book 2 & Book 3 with local code generate unique copies without 0/0', () => {
  const buku2 = { id: 'buku-2', isbn: null, kode_lokal: 'LOK-00002' };
  const buku3 = { id: 'buku-3', isbn: null, kode_lokal: 'LOK-00003' };
  
  const copies2 = generateSalinanCopies(buku2, 0, 2);
  const copies3 = generateSalinanCopies(buku3, 0, 1);
  
  assert.equal(copies2.length, 2);
  assert.equal(copies2[0].kode_eksemplar, 'LOK-00002-1');
  assert.equal(copies2[1].kode_eksemplar, 'LOK-00002-2');

  assert.equal(copies3.length, 1);
  assert.equal(copies3[0].kode_eksemplar, 'LOK-00003-1');
});

test('BOOK-003 & BOOK-001: Adding additional copies to existing book increments nomor_urut sequentially', () => {
  const buku1 = { id: 'buku-1', isbn: '978-1234567890', kode_lokal: null };
  const initialCopies = generateSalinanCopies(buku1, 0, 2);
  assert.equal(initialCopies.length, 2);
  assert.equal(initialCopies[1].nomor_urut, 2);

  // User adds 2 more copies later
  const additionalCopies = generateSalinanCopies(buku1, 2, 2);
  assert.equal(additionalCopies.length, 2);
  assert.equal(additionalCopies[0].nomor_urut, 3);
  assert.equal(additionalCopies[0].kode_eksemplar, '978-1234567890-3');
  assert.equal(additionalCopies[1].nomor_urut, 4);
  assert.equal(additionalCopies[1].kode_eksemplar, '978-1234567890-4');
});

test('BOOK-003 & DASH-001: Dashboard excludes 0/0 records and counts only books with valid copies', () => {
  const books = [
    { id: '1', dihapus: false, salinan: [{ id: 'c1', status: 'tersedia' }] },
    { id: '2', dihapus: false, salinan: [{ id: 'c2', status: 'dipinjam' }, { id: 'c3', status: 'tersedia' }] },
    { id: '3', dihapus: false, salinan: [] }, // 0/0 ghost record
    { id: '4', dihapus: true, salinan: [{ id: 'c4', status: 'tersedia' }] }, // soft-deleted
  ];

  const total = calculateDashboardTotalBuku(books);
  assert.equal(total, 2); // Only book 1 and 2
});

test('BOOK-003 & LOAN-002: Available copies are properly detected in Peminjaman', () => {
  const tenantA = 'tenant-123';
  const tenantB = 'tenant-456';

  const allSalinan = [
    { id: 's1', status: 'tersedia', buku: { id: 'b1', tenant_id: tenantA, dihapus: false } },
    { id: 's2', status: 'tersedia', buku: { id: 'b2', tenant_id: tenantA, dihapus: false } },
    { id: 's3', status: 'dipinjam', buku: { id: 'b1', tenant_id: tenantA, dihapus: false } },
    { id: 's4', status: 'tersedia', buku: { id: 'b3', tenant_id: tenantA, dihapus: true } }, // deleted book
    { id: 's5', status: 'tersedia', buku: { id: 'b4', tenant_id: tenantB, dihapus: false } }, // another tenant
  ];

  const available = filterAvailableSalinanForLoan(allSalinan, tenantA);
  assert.equal(available.length, 2);
  assert.deepEqual(available.map(a => a.id), ['s1', 's2']);
});
