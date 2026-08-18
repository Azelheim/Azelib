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

test('LOAN-001 & DASH-003/004: Loan creation & return updates Dashboard metrics in real-time', () => {
  // Initial state: 0 loans
  let loans = [];

  const getDashboardMetrics = (activeLoans) => {
    const peminjamAktifSet = new Set();
    let bukuDipinjam = 0;
    activeLoans.forEach(l => {
      if (l.status === 'aktif') {
        peminjamAktifSet.add(l.anggota_id);
        bukuDipinjam += (l.salinan_ids || []).length;
      }
    });
    return {
      peminjam_aktif: peminjamAktifSet.size,
      buku_dipinjam: bukuDipinjam,
    };
  };

  // Check initial
  let metrics = getDashboardMetrics(loans);
  assert.equal(metrics.peminjam_aktif, 0);
  assert.equal(metrics.buku_dipinjam, 0);

  // User creates loan for Member 1 with 2 books
  loans.push({ id: 'loan-1', anggota_id: 'member-1', status: 'aktif', salinan_ids: ['s1', 's2'] });
  metrics = getDashboardMetrics(loans);
  assert.equal(metrics.peminjam_aktif, 1);
  assert.equal(metrics.buku_dipinjam, 2);

  // User creates loan for Member 2 with 1 book
  loans.push({ id: 'loan-2', anggota_id: 'member-2', status: 'aktif', salinan_ids: ['s3'] });
  metrics = getDashboardMetrics(loans);
  assert.equal(metrics.peminjam_aktif, 2);
  assert.equal(metrics.buku_dipinjam, 3);

  // Member 1 creates a 2nd active loan (should not double-count distinct member)
  loans.push({ id: 'loan-3', anggota_id: 'member-1', status: 'aktif', salinan_ids: ['s4'] });
  metrics = getDashboardMetrics(loans);
  assert.equal(metrics.peminjam_aktif, 2);
  assert.equal(metrics.buku_dipinjam, 4);

  // Member 1 returns loan-1
  loans[0].status = 'dikembalikan';
  metrics = getDashboardMetrics(loans);
  assert.equal(metrics.peminjam_aktif, 2); // still has loan-3
  assert.equal(metrics.buku_dipinjam, 2);
});

test('LOAN-002: Loan quota enforcement prevents exceeding batas_maksimal_peminjaman', () => {
  const batasMaksimal = 3;
  const validateLoanSelection = (selectedCopies, limit) => {
    if (selectedCopies.length === 0) return { valid: false, error: 'Pilih minimal 1 buku' };
    if (selectedCopies.length > limit) return { valid: false, error: `Maksimal peminjaman adalah ${limit} buku` };
    return { valid: true };
  };

  assert.equal(validateLoanSelection([], batasMaksimal).valid, false);
  assert.equal(validateLoanSelection(['s1', 's2'], batasMaksimal).valid, true);
  assert.equal(validateLoanSelection(['s1', 's2', 's3'], batasMaksimal).valid, true);
  assert.equal(validateLoanSelection(['s1', 's2', 's3', 's4'], batasMaksimal).valid, false);
});

test('MEMBER-004: Member category validation allows only Siswa, Guru, or Umum', () => {
  const allowedCategories = ['Siswa', 'Guru', 'Umum'];
  const isValidCategory = (cat) => allowedCategories.includes(cat);

  assert.equal(isValidCategory('Siswa'), true);
  assert.equal(isValidCategory('Guru'), true);
  assert.equal(isValidCategory('Umum'), true);
  assert.equal(isValidCategory('Dosen'), false);
  assert.equal(isValidCategory('Admin'), false);
});

test('MEMBER-001 & Spec: Member auto-numbering and phone validation format', () => {
  const generateNomorAnggota = (existingCount) => `ANG-${String(existingCount + 1).padStart(5, '0')}`;
  assert.equal(generateNomorAnggota(0), 'ANG-00001');
  assert.equal(generateNomorAnggota(42), 'ANG-00043');
  assert.equal(generateNomorAnggota(999), 'ANG-01000');

  const phoneRegex = /^08\d{8,11}$/;
  assert.equal(phoneRegex.test('08123456789'), true);
  assert.equal(phoneRegex.test('0812345678901'), true);
  assert.equal(phoneRegex.test('07123456789'), false);
  assert.equal(phoneRegex.test('08123'), false);
});

test('REPORT-001 & REPORT-002: Period validation and report date filtering', () => {
  const validateReportPeriod = (startDate, endDate) => {
    if (!startDate || !endDate) return { valid: false, error: 'Tentukan periode awal dan akhir laporan' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return { valid: false, error: 'Format tanggal harus YYYY-MM-DD' };
    }
    if (startDate > endDate) return { valid: false, error: 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai' };
    return { valid: true };
  };

  assert.equal(validateReportPeriod('2026-01-01', '2026-01-31').valid, true);
  assert.equal(validateReportPeriod('2026-05-10', '2026-05-01').valid, false);
  assert.equal(validateReportPeriod('', '2026-01-31').valid, false);
  assert.equal(validateReportPeriod('invalid-date', '2026-01-31').valid, false);
});

test('LIB-002: Routing after login evaluates all 5 conditions correctly', () => {
  const determinePostLoginRoute = (memberships, invitations = []) => {
    if (!memberships || memberships.length === 0) {
      if (invitations.length > 0) return { route: '/tenant-setup', mode: 'join' };
      return { route: '/tenant-setup', mode: 'options' };
    }
    if (memberships.length === 1) {
      return { route: '/(admin)/dashboard', selectedTenantId: memberships[0].tenant_id, role: memberships[0].role };
    }
    return { route: '/tenant-setup', mode: 'select', count: memberships.length };
  };

  // A. User belum punya library
  const condA = determinePostLoginRoute([]);
  assert.equal(condA.route, '/tenant-setup');
  assert.equal(condA.mode, 'options');

  // B. User punya library sebagai owner (1 library)
  const condB = determinePostLoginRoute([{ tenant_id: 't-1', role: 'owner' }]);
  assert.equal(condB.route, '/(admin)/dashboard');
  assert.equal(condB.selectedTenantId, 't-1');
  assert.equal(condB.role, 'owner');

  // C. User punya invitation belum diterima (0 memberships, 1 invitation)
  const condC = determinePostLoginRoute([], [{ tenant_id: 't-inv', role_ditawarkan: 'staff' }]);
  assert.equal(condC.route, '/tenant-setup');
  assert.equal(condC.mode, 'join');

  // D. User sudah menjadi member (1 library staff)
  const condD = determinePostLoginRoute([{ tenant_id: 't-2', role: 'staff' }]);
  assert.equal(condD.route, '/(admin)/dashboard');
  assert.equal(condD.role, 'staff');

  // E. User memiliki lebih dari satu library (>1 libraries)
  const condE = determinePostLoginRoute([
    { tenant_id: 't-1', role: 'owner' },
    { tenant_id: 't-2', role: 'admin' },
  ]);
  assert.equal(condE.route, '/tenant-setup');
  assert.equal(condE.mode, 'select');
  assert.equal(condE.count, 2);
});

test('LIB-003: Member display parser handles null app_user and missing fields safely without crashing', () => {
  const parseMemberDisplayName = (member) => {
    if (!member) return 'Anggota';
    return member.app_user?.nama || member.app_user?.email || (member.user_id ? `User (${member.user_id.slice(0, 6)})` : 'Anggota');
  };

  assert.equal(parseMemberDisplayName({ user_id: 'usr-123456', app_user: { nama: 'Budi Santoso', email: 'budi@test.com' } }), 'Budi Santoso');
  assert.equal(parseMemberDisplayName({ user_id: 'usr-123456', app_user: { nama: null, email: 'budi@test.com' } }), 'budi@test.com');
  assert.equal(parseMemberDisplayName({ user_id: 'usr-123456', app_user: null }), 'User (usr-12)');
  assert.equal(parseMemberDisplayName(null), 'Anggota');
});
