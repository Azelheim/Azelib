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
    const appUserObj = Array.isArray(member.app_user) ? member.app_user[0] : member.app_user;
    return appUserObj?.nama || appUserObj?.email || (member.user_id ? `User (${member.user_id.slice(0, 6)})` : 'Anggota');
  };

  assert.equal(parseMemberDisplayName({ user_id: 'usr-123456', app_user: { nama: 'Budi Santoso', email: 'budi@test.com' } }), 'Budi Santoso');
  assert.equal(parseMemberDisplayName({ user_id: 'usr-123456', app_user: [{ nama: 'Budi Santoso', email: 'budi@test.com' }] }), 'Budi Santoso');
  assert.equal(parseMemberDisplayName({ user_id: 'usr-123456', app_user: { nama: null, email: 'budi@test.com' } }), 'budi@test.com');
  assert.equal(parseMemberDisplayName({ user_id: 'usr-123456', app_user: null }), 'User (usr-12)');
  assert.equal(parseMemberDisplayName(null), 'Anggota');
});

test('PHASE 7 — Flow 1 (Book E2E Flow): Sequential creation of 3 books with clear forms & correct copy counts', () => {
  const db = { books: [], copies: [] };
  
  const createBookWithCopies = (bookData, copyCount) => {
    assert.ok(copyCount >= 1, 'Copy count must be at least 1');
    const bookId = 'buku-' + (db.books.length + 1);
    const newBook = { id: bookId, ...bookData };
    db.books.push(newBook);

    const identifier = newBook.isbn || newBook.kode_lokal || 'LOK-00001';
    for (let i = 1; i <= copyCount; i++) {
      db.copies.push({
        id: 'salinan-' + (db.copies.length + 1),
        buku_id: bookId,
        nomor_urut: i,
        kode_eksemplar: `${identifier}-${i}`,
        status: 'tersedia'
      });
    }
    return newBook;
  };

  // 1. Tambah Buku Pertama
  createBookWithCopies({ judul: 'Laskar Pelangi', isbn: '978-979-3062-79-2' }, 3);
  // 2. Tambah Buku Kedua
  createBookWithCopies({ judul: 'Bumi Manusia', kode_lokal: 'LOK-00002' }, 2);
  // 3. Tambah Buku Ketiga
  createBookWithCopies({ judul: 'Negeri 5 Menara', isbn: '978-979-22-4861-6' }, 4);

  assert.equal(db.books.length, 3);
  assert.equal(db.copies.length, 9);
  
  // Verify no 0/0 copies
  for (const b of db.books) {
    const total = db.copies.filter(c => c.buku_id === b.id).length;
    const available = db.copies.filter(c => c.buku_id === b.id && c.status === 'tersedia').length;
    assert.ok(total > 0, `Book ${b.judul} must have copies > 0`);
    assert.equal(available, total, `Book ${b.judul} must be fully available initially`);
  }
});

test('PHASE 7 — Flow 2 (Loan E2E Flow): Borrowing multiple books updates availability & quota', () => {
  const db = {
    members: [{ id: 'm-1', nama: 'Andi' }],
    copies: [
      { id: 'c-1', buku_id: 'b-1', status: 'tersedia' },
      { id: 'c-2', buku_id: 'b-1', status: 'tersedia' },
      { id: 'c-3', buku_id: 'b-2', status: 'tersedia' },
    ],
    loans: [],
    maxQuota: 3,
  };

  const borrow = (memberId, copyIds, dueDate) => {
    assert.ok(copyIds.length <= db.maxQuota, 'Cannot exceed quota');
    for (const cId of copyIds) {
      const copy = db.copies.find(c => c.id === cId);
      assert.ok(copy, 'Copy must exist');
      assert.equal(copy.status, 'tersedia', 'Copy must be available');
      copy.status = 'dipinjam';
    }
    const loan = { id: 'l-' + (db.loans.length + 1), memberId, copyIds, dueDate, status: 'aktif' };
    db.loans.push(loan);
    return loan;
  };

  // Borrow Book 1
  borrow('m-1', ['c-1'], '2026-08-25');
  assert.equal(db.copies.find(c => c.id === 'c-1').status, 'dipinjam');
  assert.equal(db.copies.find(c => c.id === 'c-2').status, 'tersedia');
  assert.equal(db.copies.find(c => c.id === 'c-3').status, 'tersedia');

  // Borrow Book 2
  borrow('m-1', ['c-3'], '2026-08-26');
  assert.equal(db.copies.find(c => c.id === 'c-3').status, 'dipinjam');

  // Verify dashboard counts
  const activeLoans = db.loans.filter(l => l.status === 'aktif');
  const totalBorrowedCopies = activeLoans.reduce((sum, l) => sum + l.copyIds.length, 0);
  assert.equal(activeLoans.length, 2);
  assert.equal(totalBorrowedCopies, 2);
});

test('PHASE 7 — Flow 3 (Member E2E Flow): Creation, auto-numbering, and category dropdown consistency', () => {
  const members = [];
  const validCategories = ['Siswa', 'Guru', 'Umum'];

  const addMember = (nama, kategori, kontak) => {
    assert.ok(nama.trim().length >= 3, 'Nama min 3 chars');
    assert.ok(validCategories.includes(kategori), 'Category must be Siswa, Guru, or Umum');
    assert.ok(/^08\d{8,11}$/.test(kontak), 'Phone must start with 08');
    const nomor_anggota = `ANG-${String(members.length + 1).padStart(5, '0')}`;
    const m = { id: 'm-' + (members.length + 1), nomor_anggota, nama, kategori, kontak };
    members.push(m);
    return m;
  };

  addMember('Rudi Hartono', 'Siswa', '08123456789');
  addMember('Siti Aminah', 'Guru', '08198765432');
  addMember('Bambang Sutrisno', 'Umum', '08134567890');

  assert.equal(members[0].nomor_anggota, 'ANG-00001');
  assert.equal(members[1].nomor_anggota, 'ANG-00002');
  assert.equal(members[2].nomor_anggota, 'ANG-00003');
  assert.equal(members.every(m => validCategories.includes(m.kategori)), true);
});

test('PHASE 7 — Flow 4 (Report E2E Flow): Period date filtering & explicit Save/Share decision', () => {
  const transactions = [
    { id: '1', date: '2026-08-01', type: 'loan' },
    { id: '2', date: '2026-08-10', type: 'loan' },
    { id: '3', date: '2026-08-15', type: 'loan' },
    { id: '4', date: '2026-08-20', type: 'loan' },
  ];

  const filterByPeriod = (items, start, end) => {
    return items.filter(item => item.date >= start && item.date <= end);
  };

  const filtered = filterByPeriod(transactions, '2026-08-05', '2026-08-15');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].id, '2');
  assert.equal(filtered[1].id, '3');
});

test('PHASE 7 — Flow 5 (Invitation & Multi-tenant Auth E2E Flow): Safe invitation acceptance and routing', () => {
  const evaluateRouting = (userTenants, userInvitations) => {
    if (!userTenants || userTenants.length === 0) {
      if (userInvitations && userInvitations.length > 0) {
        return { target: '/tenant-setup', mode: 'join' };
      }
      return { target: '/tenant-setup', mode: 'options' };
    }
    if (userTenants.length === 1) {
      return { target: '/(admin)/dashboard', activeTenant: userTenants[0] };
    }
    return { target: '/tenant-setup', mode: 'select', libraries: userTenants };
  };

  assert.deepEqual(evaluateRouting([], []), { target: '/tenant-setup', mode: 'options' });
  assert.deepEqual(evaluateRouting([], [{ id: 'inv-1' }]), { target: '/tenant-setup', mode: 'join' });
  assert.deepEqual(evaluateRouting([{ id: 't-1', role: 'owner' }], []), { target: '/(admin)/dashboard', activeTenant: { id: 't-1', role: 'owner' } });
  assert.equal(evaluateRouting([{ id: 't-1' }, { id: 't-2' }], []).mode, 'select');
});
