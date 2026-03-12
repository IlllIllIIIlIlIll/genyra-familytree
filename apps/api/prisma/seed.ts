import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Clean slate ────────────────────────────────────────────────────────────
  await prisma.relationshipEdge.deleteMany()
  await prisma.personPhoto.deleteMany()
  await prisma.personNode.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.user.deleteMany()
  await prisma.familyGroup.deleteMany()

  console.log('✓ Cleared existing data')

  // ── Demo family: Santoso ───────────────────────────────────────────────────
  const passwordHash = await argon2.hash('password123')

  // ── Registered users ───────────────────────────────────────────────────────
  const budi = await prisma.user.create({
    data: {
      email: 'budi@example.com',
      passwordHash,
      displayName: 'Budi Santoso',
      gender: 'MALE',
      surname: 'Santoso',
      nik: '3276011009900001',
      birthDate: new Date('1990-09-10'),
      birthPlace: 'Jakarta',
      role: 'FAMILY_HEAD',
      status: 'ACTIVE',
    },
  })

  const siti = await prisma.user.create({
    data: {
      email: 'siti@example.com',
      passwordHash,
      displayName: 'Siti Rahayu',
      gender: 'FEMALE',
      surname: 'Rahayu',
      nik: '3271014505920002',
      birthDate: new Date('1992-05-05'),
      birthPlace: 'Bandung',
      role: 'FAMILY_MEMBER',
      status: 'ACTIVE',
    },
  })

  // ── Create family group ────────────────────────────────────────────────────
  const familyGroup = await prisma.familyGroup.create({
    data: {
      name: 'Keluarga Santoso',
      description: 'Demo family — Santoso lineage',
      members: { connect: [{ id: budi.id }, { id: siti.id }] },
    },
  })

  await prisma.user.updateMany({
    where: { id: { in: [budi.id, siti.id] } },
    data: { familyGroupId: familyGroup.id },
  })

  const g = familyGroup.id

  const node = async (data: Parameters<typeof prisma.personNode.create>[0]['data']) =>
    prisma.personNode.create({ data: { ...data, familyGroupId: g, canvasX: 0, canvasY: 0 } })

  const rel = async (
    type: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING',
    src: string,
    tgt: string,
    extra?: object,
  ) => prisma.relationshipEdge.create({ data: { relationshipType: type, sourceId: src, targetId: tgt, ...extra } })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 0 — Great-grandparents (Ahmad's parents)
  // ══════════════════════════════════════════════════════════════════════════

  const rono = await node({
    displayName: 'Rono Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3277010101200012', birthDate: new Date('1920-01-01'), birthPlace: 'Yogyakarta',
    deathDate: new Date('1992-03-10'), isDeceased: true,
  })

  const sumiati = await node({
    displayName: 'Sumiati', gender: 'FEMALE', surname: 'Santoso',
    nik: '3277016206250013', birthDate: new Date('1925-06-22'), birthPlace: 'Solo',
    deathDate: new Date('2000-11-05'), isDeceased: true,
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 1 — Grandparents
  // ══════════════════════════════════════════════════════════════════════════

  const ahmad = await node({
    displayName: 'Ahmad Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3276010101500003', birthDate: new Date('1950-01-01'), birthPlace: 'Yogyakarta',
    deathDate: new Date('2020-06-15'), isDeceased: true,
  })

  const sri = await node({
    displayName: 'Sri Mulyani', gender: 'FEMALE', surname: 'Mulyani',
    nik: '3276014602520004', birthDate: new Date('1952-02-06'), birthPlace: 'Solo',
  })

  // Ahmad's older brother — same generation.
  // Edge case: Harto remarries Yuni who is 22 years younger (age gap).
  const harto = await node({
    displayName: 'Harto Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3277010303480014', birthDate: new Date('1948-03-03'), birthPlace: 'Yogyakarta',
  })

  // Harto's first wife — deceased
  const mira = await node({
    displayName: 'Mira Lestari', gender: 'FEMALE', surname: 'Lestari',
    nik: '3277015504520015', birthDate: new Date('1952-04-15'), birthPlace: 'Semarang',
    deathDate: new Date('1998-07-20'), isDeceased: true,
  })

  // Harto's second wife — 22-year age gap; she is the same generation as
  // Ahmad's children. The layout will assign Yuni gen 1 via spouse resolution
  // with Harto (gen 1), demonstrating that cross-age couples share a row.
  const yuni = await node({
    displayName: 'Yuni Pratiwi', gender: 'FEMALE', surname: 'Pratiwi',
    nik: '3277016507700016', birthDate: new Date('1970-07-05'), birthPlace: 'Bandung',
  })

  // Ahmad's pre-marital first wife / partner
  // Edge case: Ahmad had a brief first marriage before Sri. This produces
  // a half-sibling for Budi/Dewi/Eko. Wati (root with no parents) gets
  // gen 1 via spouse resolution with Ahmad.
  const wati = await node({
    displayName: 'Wati', gender: 'FEMALE', surname: 'Wati',
    nik: '3277016502500019', birthDate: new Date('1950-02-15'), birthPlace: 'Surakarta',
    deathDate: new Date('2005-09-01'), isDeceased: true,
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 2 — Parents
  // ══════════════════════════════════════════════════════════════════════════

  // Ahmad + Wati's son — half-brother of Budi/Dewi/Eko (different mother)
  const toni = await node({
    displayName: 'Toni Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3277011002720020', birthDate: new Date('1972-10-02'), birthPlace: 'Solo',
  })

  // Harto + Mira's son (from first marriage)
  const dodi = await node({
    displayName: 'Dodi Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3277010809750017', birthDate: new Date('1975-08-08'), birthPlace: 'Semarang',
  })

  // Harto + Yuni's son (from second marriage — much younger half-brother of Dodi)
  const bambang = await node({
    displayName: 'Bambang Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3277010710980018', birthDate: new Date('1998-07-10'), birthPlace: 'Bandung',
  })

  // Ahmad + Sri's three children

  const budiNode = await node({
    displayName: 'Budi Santoso', gender: 'MALE', surname: 'Santoso',
    nik: budi.nik, birthDate: new Date('1990-09-10'), birthPlace: 'Jakarta',
    userId: budi.id,
  })

  const sitiNode = await node({
    displayName: 'Siti Rahayu', gender: 'FEMALE', surname: 'Rahayu',
    nik: siti.nik, birthDate: new Date('1992-05-05'), birthPlace: 'Bandung',
    userId: siti.id,
  })

  const dewi = await node({
    displayName: 'Dewi Santoso', gender: 'FEMALE', surname: 'Santoso',
    nik: '3276015510880005', birthDate: new Date('1988-10-15'), birthPlace: 'Yogyakarta',
  })

  const reza = await node({
    displayName: 'Reza Purnama', gender: 'MALE', surname: 'Purnama',
    nik: '3271010812850006', birthDate: new Date('1985-12-08'), birthPlace: 'Surabaya',
  })

  const eko = await node({
    displayName: 'Eko Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3276010302930007', birthDate: new Date('1993-02-03'), birthPlace: 'Solo',
  })

  const ayu = await node({
    displayName: 'Ayu Lestari', gender: 'FEMALE', surname: 'Lestari',
    nik: '3271012005950008', birthDate: new Date('1995-05-20'), birthPlace: 'Bali',
  })

  // Toni's wife
  const rina = await node({
    displayName: 'Rina Sari', gender: 'FEMALE', surname: 'Sari',
    nik: '3277012503750021', birthDate: new Date('1975-03-25'), birthPlace: 'Malang',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 3 — Children
  // ══════════════════════════════════════════════════════════════════════════

  const bagas = await node({
    displayName: 'Bagas Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3276011501150009', birthDate: new Date('2015-01-15'), birthPlace: 'Jakarta',
  })

  const zahra = await node({
    displayName: 'Zahra Purnama', gender: 'FEMALE', surname: 'Purnama',
    nik: '3271012003120010', birthDate: new Date('2012-03-20'), birthPlace: 'Surabaya',
  })

  const kiran = await node({
    displayName: 'Kiran Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3271010610190011', birthDate: new Date('2019-10-06'), birthPlace: 'Denpasar',
  })

  // Toni + Rina's son
  const deni = await node({
    displayName: 'Deni Santoso', gender: 'MALE', surname: 'Santoso',
    nik: '3277011011000022', birthDate: new Date('2000-10-11'), birthPlace: 'Malang',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIPS
  // ══════════════════════════════════════════════════════════════════════════

  // Gen 0
  await rel('SPOUSE', rono.id, sumiati.id, { marriageDate: new Date('1945-08-17') })

  // Gen 0 → Gen 1
  await rel('PARENT_CHILD', rono.id,    ahmad.id)
  await rel('PARENT_CHILD', sumiati.id, ahmad.id)
  await rel('PARENT_CHILD', rono.id,    harto.id)
  await rel('PARENT_CHILD', sumiati.id, harto.id)
  // Ahmad and Harto are siblings (sibling edge for visual grouping)
  await rel('SIBLING', ahmad.id, harto.id)

  // Gen 1 couples
  // Ahmad's first marriage (pre-marital / brief — no PARENT_CHILD from Rono to Wati;
  // Wati is a married-in root who receives gen 1 via spouse resolution with Ahmad)
  await rel('SPOUSE', ahmad.id, wati.id)
  // Ahmad's second marriage
  await rel('SPOUSE', ahmad.id, sri.id, { marriageDate: new Date('1975-03-20') })

  // Harto's first marriage
  await rel('SPOUSE', harto.id, mira.id, { marriageDate: new Date('1974-06-12') })
  // Harto's second marriage (after Mira died — large age gap)
  await rel('SPOUSE', harto.id, yuni.id, { marriageDate: new Date('2002-04-01') })

  // Gen 1 → Gen 2: Ahmad + Wati → Toni (half-sibling of Budi/Dewi/Eko)
  await rel('PARENT_CHILD', ahmad.id, toni.id)
  await rel('PARENT_CHILD', wati.id,  toni.id)

  // Gen 1 → Gen 2: Harto + Mira → Dodi
  await rel('PARENT_CHILD', harto.id, dodi.id)
  await rel('PARENT_CHILD', mira.id,  dodi.id)

  // Gen 1 → Gen 2: Harto + Yuni → Bambang
  await rel('PARENT_CHILD', harto.id, bambang.id)
  await rel('PARENT_CHILD', yuni.id,  bambang.id)

  // Gen 1 → Gen 2: Ahmad + Sri → three children
  await rel('PARENT_CHILD', ahmad.id, budiNode.id)
  await rel('PARENT_CHILD', sri.id,   budiNode.id)
  await rel('PARENT_CHILD', ahmad.id, dewi.id)
  await rel('PARENT_CHILD', sri.id,   dewi.id)
  await rel('PARENT_CHILD', ahmad.id, eko.id)
  await rel('PARENT_CHILD', sri.id,   eko.id)

  // Gen 2 couples
  await rel('SPOUSE', toni.id,    rina.id,     { marriageDate: new Date('1999-05-20') })
  await rel('SPOUSE', budiNode.id, sitiNode.id, { marriageDate: new Date('2015-08-17') })
  await rel('SPOUSE', reza.id,    dewi.id,     { marriageDate: new Date('2010-04-10') })
  await rel('SPOUSE', eko.id,     ayu.id,      { marriageDate: new Date('2018-11-21') })

  // Gen 2 → Gen 3
  await rel('PARENT_CHILD', toni.id,    deni.id)
  await rel('PARENT_CHILD', rina.id,    deni.id)
  await rel('PARENT_CHILD', budiNode.id, bagas.id)
  await rel('PARENT_CHILD', sitiNode.id, bagas.id)
  await rel('PARENT_CHILD', reza.id,    zahra.id)
  await rel('PARENT_CHILD', dewi.id,    zahra.id)
  await rel('PARENT_CHILD', eko.id,     kiran.id)
  await rel('PARENT_CHILD', ayu.id,     kiran.id)

  // ── EDGE CASE: Cousin marriage ─────────────────────────────────────────────
  // Bagas (Budi+Siti's son) and Zahra (Dewi+Reza's daughter) are first cousins —
  // they share grandparents Ahmad+Sri. Their marriage is added here to test the
  // layout with intra-family spouse edges at generation 3.
  await rel('SPOUSE', bagas.id, zahra.id)

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('✓ Created family: Keluarga Santoso')
  console.log('')
  console.log('  Gen 0 : Rono (†) ↔ Sumiati (†)')
  console.log('  Gen 1 : Ahmad (†) ↔ [Wati(†), Sri] | Harto ↔ [Mira(†), Yuni]')
  console.log('  Gen 2 : Toni↔Rina | Dodi | Bambang | Budi↔Siti | Reza↔Dewi | Eko↔Ayu')
  console.log('  Gen 3 : Deni | Bagas↔Zahra (cousin marriage!) | Kiran')
  console.log('')
  console.log('Edge cases demonstrated:')
  console.log('  • 4-generation depth (great-grandparents → children)')
  console.log('  • Remarriage: Harto had two wives (Mira died, then Yuni)')
  console.log('  • Age gap: Harto (1948) married Yuni (1970) — 22 year gap')
  console.log('  • Pre-marital half-sibling: Toni is Ahmad\'s son by first wife Wati')
  console.log('  • Cousin marriage (incest): Bagas + Zahra share grandparents Ahmad+Sri')
  console.log('')
  console.log('Demo accounts:')
  console.log('  budi@example.com  / password123  (Family Head)')
  console.log('  siti@example.com  / password123  (Family Member)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
