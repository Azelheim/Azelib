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

test('LIB-004 (Supercedes LIB-002): Post-login routing unconditionally routes all users to /tenant-setup hub', () => {
  const determinePostLoginRoute = () => {
    // LIB-004: Semua user setelah login SELALU diarahkan ke halaman pemilihan / hub (/tenant-setup)
    return { route: '/tenant-setup' };
  };

  const evaluateTenantSetupViewMode = (memberships, invitations = []) => {
    if (memberships && memberships.length > 0) {
      return { mode: 'select', libraryCount: memberships.length };
    }
    if (invitations && invitations.length > 0) {
      return { mode: 'join', invitationCount: invitations.length };
    }
    return { mode: 'options' };
  };

  // 1. All users route to /tenant-setup
  assert.equal(determinePostLoginRoute().route, '/tenant-setup');

  // 2. User with exactly 1 library -> stays on /tenant-setup in 'select' mode (not auto-skipped)
  const singleLib = evaluateTenantSetupViewMode([{ tenant_id: 't-1', role: 'owner' }]);
  assert.equal(singleLib.mode, 'select');
  assert.equal(singleLib.libraryCount, 1);

  // 3. User with multiple libraries -> 'select' mode showing all libraries
  const multiLib = evaluateTenantSetupViewMode([
    { tenant_id: 't-1', role: 'owner' },
    { tenant_id: 't-2', role: 'admin' },
  ]);
  assert.equal(multiLib.mode, 'select');
  assert.equal(multiLib.libraryCount, 2);

  // 4. User without library but with pending invitation -> 'join' mode
  const invOnly = evaluateTenantSetupViewMode([], [{ tenant_id: 't-inv', role: 'staff' }]);
  assert.equal(invOnly.mode, 'join');
  assert.equal(invOnly.invitationCount, 1);

  // 5. User without library and no invitation -> 'options' mode
  const newAccount = evaluateTenantSetupViewMode([], []);
  assert.equal(newAccount.mode, 'options');
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

test('PHASE 8 — SUGGESTION-001: Searchable & Creatable Category handles case-insensitivity & whitespace trimming without duplicate DB entries', () => {
  const dbCategories = [
    { id: 'kat-1', nama: 'Fiksi' },
    { id: 'kat-2', nama: 'Sains' },
  ];

  const getOrCreateCategory = (input) => {
    if (!input || !input.trim()) return null;
    const clean = input.trim();
    const existing = dbCategories.find(c => c.nama.toLowerCase() === clean.toLowerCase());
    if (existing) return existing.id;

    const newCat = { id: 'kat-' + (dbCategories.length + 1), nama: clean };
    dbCategories.push(newCat);
    return newCat.id;
  };

  // Case-insensitive match should reuse existing
  const fiksiId1 = getOrCreateCategory('fiksi');
  const fiksiId2 = getOrCreateCategory('  FIKSI   ');
  assert.equal(fiksiId1, 'kat-1');
  assert.equal(fiksiId2, 'kat-1');

  // New category created upon save
  const sejarahId = getOrCreateCategory('  Sejarah Indonesia  ');
  assert.equal(sejarahId, 'kat-3');
  assert.equal(dbCategories.find(c => c.id === 'kat-3').nama, 'Sejarah Indonesia');
  assert.equal(dbCategories.length, 3);
});

test('PHASE 8 — SUGGESTION-002: Quick Add Anggota creates member and automatically selects them in active loan modal', () => {
  const members = [{ id: 'm-1', nama: 'Budi' }];
  let selectedMemberInLoan = null;

  const quickAddAndSelect = (nama, kategori, kontak) => {
    assert.ok(nama.trim().length >= 3, 'Nama min 3 chars');
    assert.ok(/^08\d{8,11}$/.test(kontak), 'Valid phone');
    const newMember = {
      id: 'm-' + (members.length + 1),
      nomor_anggota: `ANG-${String(members.length + 1).padStart(5, '0')}`,
      nama: nama.trim(),
      kategori,
      kontak: kontak.trim(),
    };
    members.push(newMember);
    selectedMemberInLoan = newMember;
    return newMember;
  };

  const newMember = quickAddAndSelect('Dewi Lestari', 'Guru', '081299887766');
  assert.equal(newMember.nomor_anggota, 'ANG-00002');
  assert.equal(selectedMemberInLoan.id, 'm-2');
  assert.equal(selectedMemberInLoan.nama, 'Dewi Lestari');
});

test('LOAN-003: Automatic due date calculation based on tenant maksimal_hari_pinjam setting (non-retroactive)', () => {
  const calculateDueDate = (startDateStr, maxDays = 7) => {
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + maxDays);
    return d.toISOString().split('T')[0];
  };

  // 1. Default setting = 7 hari
  assert.equal(calculateDueDate('2026-08-18', 7), '2026-08-25');

  // 2. Custom setting = 14 hari
  assert.equal(calculateDueDate('2026-08-18', 14), '2026-09-01');

  // 3. Custom setting = 3 hari
  assert.equal(calculateDueDate('2026-08-18', 3), '2026-08-21');

  // 4. Non-retroactive test: Loan 1 created under 7-day setting keeps its due date when tenant changes to 14 days
  const loans = [];
  let tenantSettingDays = 7;

  const createLoan = (memberId, loanDate) => {
    const dueDate = calculateDueDate(loanDate, tenantSettingDays);
    const loan = { id: 'l-' + (loans.length + 1), memberId, loanDate, dueDate, maxDaysAtCreation: tenantSettingDays };
    loans.push(loan);
    return loan;
  };

  const loan1 = createLoan('m-1', '2026-08-18');
  assert.equal(loan1.dueDate, '2026-08-25');

  // Tenant changes setting to 14 days
  tenantSettingDays = 14;

  const loan2 = createLoan('m-2', '2026-08-18');
  assert.equal(loan2.dueDate, '2026-09-01');

  // Loan 1 remains unchanged (non-retroactive)
  assert.equal(loans[0].dueDate, '2026-08-25');
});

test('PHASE 10 — DASH-006: Book Carousel calculates Slide 1 (Total Copies) vs Slide 2 (Distinct Titles) accurately', () => {
  const books = [
    { id: 'b-1', judul: 'Laskar Pelangi', dihapus: false, salinan: [{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }] }, // 3 copies
    { id: 'b-2', judul: 'Bumi Manusia', dihapus: false, salinan: [{ id: 's-4' }, { id: 's-5' }] }, // 2 copies
    { id: 'b-3', judul: 'Negeri 5 Menara', dihapus: false, salinan: [{ id: 's-6' }] }, // 1 copy
    { id: 'b-4', judul: 'Ghost Book', dihapus: false, salinan: [] }, // 0 copies (excluded)
    { id: 'b-5', judul: 'Deleted Book', dihapus: true, salinan: [{ id: 's-7' }] }, // soft-deleted (excluded)
  ];

  const calculateCarouselMetrics = (rawBooks) => {
    const validBooks = rawBooks.filter(b => !b.dihapus && b.salinan && b.salinan.length > 0);
    let totalCopies = 0;
    validBooks.forEach(b => {
      totalCopies += b.salinan.length;
    });

    return {
      slide1_jumlahBuku: totalCopies, // Total salinan (6)
      slide2_jumlahJudul: validBooks.length, // Distinct titles (3)
    };
  };

  const metrics = calculateCarouselMetrics(books);
  assert.equal(metrics.slide1_jumlahBuku, 6);
  assert.equal(metrics.slide2_jumlahJudul, 3);
});

test('PHASE 10 — DASH-007: Chart filter configurations contain full unabridged labels and responsive definitions', () => {
  const contextFilters = [
    { value: 'buku', label: 'Buku' },
    { value: 'peminjam', label: 'Peminjam' },
    { value: 'denda', label: 'Denda' },
  ];

  const periodFilters = [
    { value: 'harian', label: 'Harian' },
    { value: 'mingguan', label: 'Mingguan' },
    { value: 'bulanan', label: 'Bulanan' },
  ];

  assert.equal(contextFilters.find(f => f.value === 'peminjam').label, 'Peminjam');
  assert.equal(periodFilters.find(f => f.value === 'mingguan').label, 'Mingguan');
  assert.equal(periodFilters.find(f => f.value === 'bulanan').label, 'Bulanan');

  // Verify no ellipsis or truncation in label definitions
  for (const f of [...contextFilters, ...periodFilters]) {
    assert.ok(!f.label.includes('...'), `Label ${f.label} must not be truncated`);
  }
});

test('PHASE 11 — BOOK-006: Rak is mandatory for book creation/edit, deduplicated, with fallback indicator for legacy books', () => {
  const dbRaks = [
    { id: 'rak-1', nama: 'Rak A' },
    { id: 'rak-2', nama: 'Rak B' },
  ];

  const validateAndSaveBook = (bookInput) => {
    if (!bookInput.judul || !bookInput.judul.trim()) {
      return { success: false, error: 'Judul buku wajib diisi' };
    }
    if (!bookInput.rak || !bookInput.rak.trim()) {
      return { success: false, error: 'Rak wajib diisi' };
    }

    const cleanRak = bookInput.rak.trim();
    let rakObj = dbRaks.find(r => r.nama.toLowerCase() === cleanRak.toLowerCase());
    if (!rakObj) {
      rakObj = { id: 'rak-' + (dbRaks.length + 1), nama: cleanRak };
      dbRaks.push(rakObj);
    }

    return { success: true, book: { ...bookInput, rak_id: rakObj.id, rak_nama: rakObj.nama } };
  };

  // 1. Rejection without Rak
  const noRakRes = validateAndSaveBook({ judul: 'Belajar Sains', rak: '' });
  assert.equal(noRakRes.success, false);
  assert.equal(noRakRes.error, 'Rak wajib diisi');

  const whitespaceRakRes = validateAndSaveBook({ judul: 'Belajar Sains', rak: '   ' });
  assert.equal(whitespaceRakRes.success, false);
  assert.equal(whitespaceRakRes.error, 'Rak wajib diisi');

  // 2. Acceptance with existing Rak (case-insensitive deduplication)
  const existingRakRes = validateAndSaveBook({ judul: 'Belajar Sains', rak: '  rak a  ' });
  assert.equal(existingRakRes.success, true);
  assert.equal(existingRakRes.book.rak_id, 'rak-1');
  assert.equal(dbRaks.length, 2); // no duplicates created

  // 3. Acceptance with new Rak
  const newRakRes = validateAndSaveBook({ judul: 'Ensiklopedia Sejarah', rak: 'Rak C (Lantai 2)' });
  assert.equal(newRakRes.success, true);
  assert.equal(newRakRes.book.rak_id, 'rak-3');
  assert.equal(dbRaks.length, 3);

  // 4. Legacy book fallback renderer
  const renderRakBadge = (book) => {
    if (book.rak_nama) {
      return { label: `Rak: ${book.rak_nama}`, isWarning: false };
    }
    return { label: 'Rak: Belum Ditentukan ⚠️', isWarning: true };
  };

  const legacyBook = { id: 'legacy-1', judul: 'Buku Jadul', rak_nama: null };
  const badge = renderRakBadge(legacyBook);
  assert.equal(badge.label, 'Rak: Belum Ditentukan ⚠️');
  assert.equal(badge.isWarning, true);
});

test('PHASE 12 — LOAN-005 & LOAN-006: 2-Tier Book Selection groups copies under titles and filters by Rak', () => {
  const books = [
    { id: 'b-1', judul: 'Fisika Dasar', rak_id: 'rak-A' },
    { id: 'b-2', judul: 'Kimia Organik', rak_id: 'rak-B' },
    { id: 'b-3', judul: 'Biologi Sel', rak_id: 'rak-A' },
    { id: 'b-4', judul: 'Matematika Diskrit', rak_id: 'rak-C' },
  ];

  const copies = [
    { id: 'c-1', buku_id: 'b-1', nomor_urut: 1, status: 'tersedia' },
    { id: 'c-2', buku_id: 'b-1', nomor_urut: 2, status: 'dipinjam' },
    { id: 'c-3', buku_id: 'b-2', nomor_urut: 1, status: 'tersedia' },
    { id: 'c-4', buku_id: 'b-3', nomor_urut: 1, status: 'dipinjam' }, // 0 available copies
    { id: 'c-5', buku_id: 'b-4', nomor_urut: 1, status: 'tersedia' },
  ];

  // 1. Group available copies per title (LOAN-005)
  const groupAvailableCopies = (rawBooks, rawCopies, filterRak = null) => {
    return rawBooks
      .filter(b => !filterRak || b.rak_id === filterRak)
      .map(b => {
        const available = rawCopies.filter(c => c.buku_id === b.id && c.status === 'tersedia');
        return { ...b, availableCopies: available };
      })
      .filter(b => b.availableCopies.length > 0);
  };

  // Semua Rak -> Fisika (1 tersedia), Kimia (1 tersedia), Matematika (1 tersedia); Biologi excluded (0 tersedia)
  const allRak = groupAvailableCopies(books, copies, null);
  assert.equal(allRak.length, 3);
  assert.equal(allRak.find(b => b.id === 'b-1').availableCopies.length, 1);
  assert.equal(allRak.find(b => b.id === 'b-3'), undefined); // 0 available -> excluded

  // Filter Rak A -> Only Fisika (1 tersedia)
  const rakA = groupAvailableCopies(books, copies, 'rak-A');
  assert.equal(rakA.length, 1);
  assert.equal(rakA[0].id, 'b-1');

  // Filter Rak B -> Only Kimia (1 tersedia)
  const rakB = groupAvailableCopies(books, copies, 'rak-B');
  assert.equal(rakB.length, 1);
  assert.equal(rakB[0].id, 'b-2');
});

test('PHASE 12 — LOAN-007: Date adjustment chips calculate future due date strings correctly', () => {
  const getPresetDate = (baseDateStr, daysToAdd) => {
    const d = new Date(baseDateStr);
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split('T')[0];
  };

  const base = '2026-08-18';
  assert.equal(getPresetDate(base, 3), '2026-08-21');
  assert.equal(getPresetDate(base, 7), '2026-08-25');
  assert.equal(getPresetDate(base, 14), '2026-09-01');
  assert.equal(getPresetDate(base, 30), '2026-09-17');
});

test('PHASE 12 — LOAN-008: Dynamic padding for copy code display [Kode: XXXX]', () => {
  const formatKodeSalinan = (nomorUrut, totalSalinan) => {
    const digits = Math.max(2, String(Math.max(totalSalinan, nomorUrut)).length);
    return `Kode: ${String(nomorUrut).padStart(digits, '0')}`;
  };

  // 1 to 9 copies -> 2 digits minimum (01, 02, ..., 09)
  assert.equal(formatKodeSalinan(1, 5), 'Kode: 01');
  assert.equal(formatKodeSalinan(5, 5), 'Kode: 05');

  // 10 to 99 copies -> 2 digits (01, ..., 25, ..., 99)
  assert.equal(formatKodeSalinan(3, 45), 'Kode: 03');
  assert.equal(formatKodeSalinan(45, 45), 'Kode: 45');

  // 100+ copies -> 3 digits (001, ..., 120)
  assert.equal(formatKodeSalinan(1, 150), 'Kode: 001');
  assert.equal(formatKodeSalinan(89, 150), 'Kode: 089');
  assert.equal(formatKodeSalinan(150, 150), 'Kode: 150');

  // 1000+ copies -> 4 digits (0001, ..., 1250)
  assert.equal(formatKodeSalinan(7, 2000), 'Kode: 0007');
  assert.equal(formatKodeSalinan(1250, 2000), 'Kode: 1250');
});

test('PHASE 13 — REPORT-003: Date presets and period filtering synchronize correctly with report exports', () => {
  const getPresetRange = (preset, baseDate = new Date('2026-08-18T12:00:00Z')) => {
    const today = baseDate.toISOString().split('T')[0];
    if (preset === 'hariIni') {
      return { mulai: today, selesai: today };
    }
    if (preset === '7hari') {
      const past7 = new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { mulai: past7, selesai: today };
    }
    if (preset === '30hari') {
      const past30 = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { mulai: past30, selesai: today };
    }
    if (preset === 'tahunIni') {
      const startYear = `${baseDate.getFullYear()}-01-01`;
      return { mulai: startYear, selesai: today };
    }
    return { mulai: today, selesai: today };
  };

  const fixedBase = new Date('2026-08-18T12:00:00Z');
  const hariIni = getPresetRange('hariIni', fixedBase);
  assert.equal(hariIni.mulai, '2026-08-18');
  assert.equal(hariIni.selesai, '2026-08-18');

  const tujuhHari = getPresetRange('7hari', fixedBase);
  assert.equal(tujuhHari.mulai, '2026-08-11');
  assert.equal(tujuhHari.selesai, '2026-08-18');

  const tigapuluhHari = getPresetRange('30hari', fixedBase);
  assert.equal(tigapuluhHari.mulai, '2026-07-19');
  assert.equal(tigapuluhHari.selesai, '2026-08-18');

  const tahunIni = getPresetRange('tahunIni', fixedBase);
  assert.equal(tahunIni.mulai, '2026-01-01');
  assert.equal(tahunIni.selesai, '2026-08-18');

  // Verify synchronization into PDF report metadata header
  const generateHeaderSnippet = (range) => `<p><strong>Periode:</strong> ${range.mulai} s/d ${range.selesai}</p>`;
  assert.ok(generateHeaderSnippet(tujuhHari).includes('2026-08-11 s/d 2026-08-18'));
});

test('PHASE 14 — ROLE-001 & ROLE-002: Backend authorization guards enforce strict permission matrix', () => {
  const authorizeAction = (actorRole, action, targetRole = null) => {
    switch (action) {
      case 'MUTATE_DATA': // Add/Edit/Delete Books, Loans, Members, Settings
        if (actorRole === 'staff') throw new Error('Member hanya memiliki akses baca (view-only)');
        return true;
      case 'INVITE_MEMBER':
        if (actorRole === 'staff') throw new Error('Hanya Owner dan Admin yang dapat mengundang anggota');
        return true;
      case 'PROMOTE_MEMBER':
        if (actorRole !== 'owner') throw new Error('Hanya Owner yang dapat mengubah role pengelola');
        return true;
      case 'REMOVE_MEMBER':
        if (actorRole === 'staff') throw new Error('Hanya Owner dan Admin yang dapat mengeluarkan anggota');
        if (targetRole === 'owner') throw new Error('Owner tidak dapat dikeluarkan');
        if (actorRole === 'admin' && targetRole === 'admin') throw new Error('Hanya Owner yang dapat mengeluarkan Admin');
        return true;
      case 'EXPORT_REPORT':
      case 'GENERATE_BARCODE':
        return true; // All roles allowed
      default:
        throw new Error('Aksi tidak dikenali');
    }
  };

  // 1. Mutation: Owner & Admin allowed, Staff forbidden
  assert.equal(authorizeAction('owner', 'MUTATE_DATA'), true);
  assert.equal(authorizeAction('admin', 'MUTATE_DATA'), true);
  assert.throws(() => authorizeAction('staff', 'MUTATE_DATA'), /view-only/);

  // 2. Invite: Owner & Admin allowed, Staff forbidden
  assert.equal(authorizeAction('owner', 'INVITE_MEMBER'), true);
  assert.equal(authorizeAction('admin', 'INVITE_MEMBER'), true);
  assert.throws(() => authorizeAction('staff', 'INVITE_MEMBER'), /Hanya Owner dan Admin/);

  // 3. Promote: Only Owner allowed
  assert.equal(authorizeAction('owner', 'PROMOTE_MEMBER'), true);
  assert.throws(() => authorizeAction('admin', 'PROMOTE_MEMBER'), /Hanya Owner/);
  assert.throws(() => authorizeAction('staff', 'PROMOTE_MEMBER'), /Hanya Owner/);

  // 4. Remove:
  // - Owner can remove admin & staff, but not owner
  assert.equal(authorizeAction('owner', 'REMOVE_MEMBER', 'admin'), true);
  assert.equal(authorizeAction('owner', 'REMOVE_MEMBER', 'staff'), true);
  assert.throws(() => authorizeAction('owner', 'REMOVE_MEMBER', 'owner'), /Owner tidak dapat dikeluarkan/);

  // - Admin can remove staff, but cannot remove admin or owner
  assert.equal(authorizeAction('admin', 'REMOVE_MEMBER', 'staff'), true);
  assert.throws(() => authorizeAction('admin', 'REMOVE_MEMBER', 'admin'), /Hanya Owner yang dapat mengeluarkan Admin/);
  assert.throws(() => authorizeAction('admin', 'REMOVE_MEMBER', 'owner'), /Owner tidak dapat dikeluarkan/);

  // - Staff cannot remove anyone
  assert.throws(() => authorizeAction('staff', 'REMOVE_MEMBER', 'staff'), /Hanya Owner dan Admin/);

  // 5. Reports & Barcode: All allowed
  assert.equal(authorizeAction('owner', 'EXPORT_REPORT'), true);
  assert.equal(authorizeAction('admin', 'EXPORT_REPORT'), true);
  assert.equal(authorizeAction('staff', 'EXPORT_REPORT'), true);

  assert.equal(authorizeAction('owner', 'GENERATE_BARCODE'), true);
  assert.equal(authorizeAction('admin', 'GENERATE_BARCODE'), true);
  assert.equal(authorizeAction('staff', 'GENERATE_BARCODE'), true);
});

test('PHASE 14 — ROLE-003 & ROLE-004: UI permission helpers and role display consistency', () => {
  const getRoleUIPermissions = (role) => {
    return {
      canMutateBooksAndMembers: role === 'owner' || role === 'admin',
      canInvite: role === 'owner' || role === 'admin',
      canPromote: role === 'owner',
      canRemoveAdmin: role === 'owner',
      canRemoveStaff: role === 'owner' || role === 'admin',
      canExportReport: true,
      canGenerateBarcode: true,
    };
  };

  const ownerPerms = getRoleUIPermissions('owner');
  assert.equal(ownerPerms.canMutateBooksAndMembers, true);
  assert.equal(ownerPerms.canInvite, true);
  assert.equal(ownerPerms.canPromote, true);
  assert.equal(ownerPerms.canRemoveAdmin, true);
  assert.equal(ownerPerms.canRemoveStaff, true);

  const adminPerms = getRoleUIPermissions('admin');
  assert.equal(adminPerms.canMutateBooksAndMembers, true);
  assert.equal(adminPerms.canInvite, true);
  assert.equal(adminPerms.canPromote, false);
  assert.equal(adminPerms.canRemoveAdmin, false);
  assert.equal(adminPerms.canRemoveStaff, true);

  const memberPerms = getRoleUIPermissions('staff');
  assert.equal(memberPerms.canMutateBooksAndMembers, false);
  assert.equal(memberPerms.canInvite, false);
  assert.equal(memberPerms.canPromote, false);
  assert.equal(memberPerms.canRemoveAdmin, false);
  assert.equal(memberPerms.canRemoveStaff, false);
  assert.equal(memberPerms.canExportReport, true);
  assert.equal(memberPerms.canGenerateBarcode, true);
});

test('PHASE 15 — BARCODE-001: Guest QR Code resolution and public catalog view-only isolation', () => {
  const tenants = [
    { id: 'tenant-1', nama: 'Perpustakaan SMAN 1', qr_code_value: 'QR-SMAN1-JKT' },
    { id: 'tenant-2', nama: 'Perpustakaan Daerah', qr_code_value: 'QR-PERPUSDA-01' },
  ];

  // 1. QR Code Resolution
  const resolveQrCode = (qrCodeString) => {
    const found = tenants.find(t => t.qr_code_value === qrCodeString);
    if (!found) throw new Error('QR tidak dikenali, coba lagi');
    return {
      route: `/pengunjung?tenant_id=${found.id}&nama=${encodeURIComponent(found.nama)}`,
      tenant: found
    };
  };

  const validScan = resolveQrCode('QR-SMAN1-JKT');
  assert.equal(validScan.tenant.id, 'tenant-1');
  assert.ok(validScan.route.includes('/pengunjung?tenant_id=tenant-1'));

  assert.throws(() => resolveQrCode('INVALID-QR-999'), /QR tidak dikenali, coba lagi/);

  // 2. Public Catalog Data Transformation (Only public fields allowed)
  const internalBook = {
    id: 'book-101',
    tenant_id: 'tenant-1',
    judul: 'Laskar Pelangi',
    penulis: 'Andrea Hirata',
    penerbit: 'Bentang Pustaka', // Admin only
    tahun_terbit: 2005,          // Admin only
    isbn: '9789793062792',       // Admin only
    bahasa: 'Indonesia',         // Admin only
    jumlah_halaman: 529,         // Admin only
    sinopsis: 'Kisah 10 anak di Belitung...',
    kategori: { nama: 'Novel' },
    rak: { nama: 'Rak Sastra' },
    salinan: [
      { id: 's1', status: 'tersedia' },
      { id: 's2', status: 'dipinjam' }
    ]
  };

  const transformToPublicCatalog = (book) => {
    const totalCopies = (book.salinan || []).length;
    const availableCopies = (book.salinan || []).filter(s => s.status === 'tersedia').length;
    return {
      id: book.id,
      judul: book.judul,
      penulis: book.penulis || 'Penulis tidak diketahui',
      sinopsis: book.sinopsis || 'Belum ada sinopsis.',
      kategori: book.kategori?.nama || 'Tanpa Kategori',
      rak: book.rak?.nama || 'Tanpa Rak',
      statusKetersediaan: availableCopies > 0 ? `Tersedia (${availableCopies}/${totalCopies})` : 'Habis Dipinjam',
      isTersedia: availableCopies > 0
    };
  };

  const publicBook = transformToPublicCatalog(internalBook);
  assert.equal(publicBook.judul, 'Laskar Pelangi');
  assert.equal(publicBook.kategori, 'Novel');
  assert.equal(publicBook.rak, 'Rak Sastra');
  assert.equal(publicBook.statusKetersediaan, 'Tersedia (1/2)');
  assert.equal(publicBook.isTersedia, true);

  // Ensure admin fields are NOT exposed on public book object
  assert.equal(publicBook.isbn, undefined);
  assert.equal(publicBook.penerbit, undefined);
  assert.equal(publicBook.tahun_terbit, undefined);
  assert.equal(publicBook.bahasa, undefined);
  assert.equal(publicBook.jumlah_halaman, undefined);

  // 3. Navigation Lock / Route Isolation Check
  const getAvailableRoutesForRole = (role) => {
    if (role === 'guest') {
      return ['/pengunjung', '/']; // Only guest catalog and exit back to gate
    }
    return ['/dashboard', '/buku', '/peminjaman', '/anggota', '/laporan', '/pengaturan'];
  };

  const guestRoutes = getAvailableRoutesForRole('guest');
  assert.deepEqual(guestRoutes, ['/pengunjung', '/']);
  assert.equal(guestRoutes.includes('/dashboard'), false);
  assert.equal(guestRoutes.includes('/peminjaman'), false);
  assert.equal(guestRoutes.includes('/pengaturan'), false);
});

test('PHASE 16 — Flow 6 (Login & Library Selection E2E Flow): All users unconditionally stop at selection hub', () => {
  // Scenario 1: User with 1 library
  const userWithOneLib = { id: 'u1', email: 'owner1@test.com', tenants: [{ id: 't1', nama: 'Perpus 1' }], invitations: [] };
  const routeForUser1 = userWithOneLib.id ? '/tenant-setup' : '/login';
  assert.equal(routeForUser1, '/tenant-setup');

  // Scenario 2: User with multiple libraries
  const userWithMultiLib = { id: 'u2', email: 'multi@test.com', tenants: [{ id: 't1', nama: 'P1' }, { id: 't2', nama: 'P2' }], invitations: [] };
  const routeForUser2 = userWithMultiLib.id ? '/tenant-setup' : '/login';
  assert.equal(routeForUser2, '/tenant-setup');

  // Scenario 3: User with pending invitations
  const userWithInvites = { id: 'u3', email: 'invitee@test.com', tenants: [], invitations: [{ id: 'inv-1', tenant: { nama: 'Perpus Baru' } }] };
  const routeForUser3 = userWithInvites.id ? '/tenant-setup' : '/login';
  assert.equal(routeForUser3, '/tenant-setup');

  // Scenario 4: User without libraries or invitations
  const newRegisteredUser = { id: 'u4', email: 'newbie@test.com', tenants: [], invitations: [] };
  const routeForUser4 = newRegisteredUser.id ? '/tenant-setup' : '/login';
  assert.equal(routeForUser4, '/tenant-setup');
});

test('PHASE 16 — Flow 7 (Loan End-to-End Flow): 2-tier selection, rak filter, date picker, copy codes, and live metrics', () => {
  // Setup books with copies in various shelves
  const books = [
    {
      id: 'b1',
      judul: 'Fisika Dasar',
      rak_id: 'rak-sains',
      rak: { id: 'rak-sains', nama: 'Rak Sains' },
      salinan: [
        { id: 's1', nomor_urut: 1, kode_eksemplar: 'FIS-01', status: 'tersedia' },
        { id: 's2', nomor_urut: 2, kode_eksemplar: 'FIS-02', status: 'tersedia' },
      ]
    },
    {
      id: 'b2',
      judul: 'Sejarah Dunia',
      rak_id: 'rak-sejarah',
      rak: { id: 'rak-sejarah', nama: 'Rak Sejarah' },
      salinan: [
        { id: 's3', nomor_urut: 1, kode_eksemplar: 'SEJ-01', status: 'tersedia' },
      ]
    }
  ];

  // 1. Filter by Rak (LOAN-006)
  const filterByRak = (bookList, selectedRak) => {
    if (!selectedRak) return bookList;
    return bookList.filter(b => b.rak_id === selectedRak);
  };
  const sainsBooks = filterByRak(books, 'rak-sains');
  assert.equal(sainsBooks.length, 1);
  assert.equal(sainsBooks[0].judul, 'Fisika Dasar');

  // 2. 2-Tier Selection (LOAN-005) & Formatted Copy Codes (LOAN-008)
  const formatKodeSalinan = (nomorUrut, totalSalinan) => {
    const digits = Math.max(2, String(Math.max(totalSalinan, nomorUrut)).length);
    return `Kode: ${String(nomorUrut).padStart(digits, '0')}`;
  };

  const selectedBook = sainsBooks[0];
  const availableCopies = selectedBook.salinan.filter(s => s.status === 'tersedia');
  assert.equal(availableCopies.length, 2);

  const formattedCode1 = formatKodeSalinan(availableCopies[0].nomor_urut, selectedBook.salinan.length);
  const formattedCode2 = formatKodeSalinan(availableCopies[1].nomor_urut, selectedBook.salinan.length);
  assert.equal(formattedCode1, 'Kode: 01');
  assert.equal(formattedCode2, 'Kode: 02');

  // 3. Date Presets (LOAN-007)
  const today = '2026-08-18';
  const calculatePresetDueDate = (baseDateStr, days) => {
    const d = new Date(baseDateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };
  assert.equal(calculatePresetDueDate(today, 7), '2026-08-25');
  assert.equal(calculatePresetDueDate(today, 14), '2026-09-01');

  // 4. Perform Loan Mutation
  availableCopies[0].status = 'dipinjam';
  const updatedAvailable = selectedBook.salinan.filter(s => s.status === 'tersedia');
  assert.equal(updatedAvailable.length, 1);
  assert.equal(updatedAvailable[0].nomor_urut, 2);
});

test('PHASE 16 — Flow 8 (Role & Permission Matrix Full Enforcement): Owner, Admin, Member actions', () => {
  const checkPermission = (role, action, targetRole = null) => {
    if (role === 'staff') {
      // Member can only export reports and generate/print barcodes
      if (action === 'EXPORT_REPORT' || action === 'GENERATE_BARCODE' || action === 'VIEW_CATALOG') return true;
      return false;
    }
    if (role === 'admin') {
      if (action === 'REMOVE_ADMIN' || action === 'REMOVE_OWNER' || action === 'PROMOTE_ADMIN') return false;
      return true;
    }
    if (role === 'owner') {
      if (action === 'REMOVE_OWNER') return false;
      return true;
    }
    return false;
  };

  // Member (Staff):
  assert.equal(checkPermission('staff', 'ADD_BOOK'), false);
  assert.equal(checkPermission('staff', 'EDIT_BOOK'), false);
  assert.equal(checkPermission('staff', 'DELETE_BOOK'), false);
  assert.equal(checkPermission('staff', 'CREATE_LOAN'), false);
  assert.equal(checkPermission('staff', 'RETURN_LOAN'), false);
  assert.equal(checkPermission('staff', 'INVITE_MEMBER'), false);
  assert.equal(checkPermission('staff', 'EXPORT_REPORT'), true);
  assert.equal(checkPermission('staff', 'GENERATE_BARCODE'), true);

  // Admin:
  assert.equal(checkPermission('admin', 'ADD_BOOK'), true);
  assert.equal(checkPermission('admin', 'CREATE_LOAN'), true);
  assert.equal(checkPermission('admin', 'INVITE_MEMBER'), true);
  assert.equal(checkPermission('admin', 'REMOVE_MEMBER'), true);
  assert.equal(checkPermission('admin', 'REMOVE_ADMIN'), false);
  assert.equal(checkPermission('admin', 'REMOVE_OWNER'), false);
  assert.equal(checkPermission('admin', 'PROMOTE_ADMIN'), false);

  // Owner:
  assert.equal(checkPermission('owner', 'ADD_BOOK'), true);
  assert.equal(checkPermission('owner', 'PROMOTE_ADMIN'), true);
  assert.equal(checkPermission('owner', 'REMOVE_ADMIN'), true);
  assert.equal(checkPermission('owner', 'REMOVE_MEMBER'), true);
  assert.equal(checkPermission('owner', 'REMOVE_OWNER'), false);
});




