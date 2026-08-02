import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ADMIN_EMAIL  = process.env['SEED_ADMIN_EMAIL']  ?? '18222070@std.stei.itb.ac.id'
const OWNER_EMAIL   = process.env['SEED_OWNER_EMAIL']  ?? 'favbalhan@gmail.com'

// Deterministic PRNG (mulberry32) so re-seeding always produces the same
// "randomized" names across local dev and every deployment.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j] as T, a[i] as T]
  }
  return a
}

const rand = mulberry32(20260802)
const MALE_NAMES = shuffle([
  'Wahyu', 'Bambang', 'Dedi', 'Hendra', 'Rizky', 'Fajar', 'Yusuf', 'Arif',
  'Bayu', 'Doni', 'Eko', 'Fahmi', 'Gilang', 'Hadi', 'Irfan', 'Joko',
  'Kurnia', 'Lukman', 'Malik', 'Nanda', 'Oscar', 'Prima', 'Rendra', 'Satria',
  'Taufik', 'Umar', 'Vino', 'Wisnu', 'Yudha', 'Zaki',
], rand)
const FEMALE_NAMES = shuffle([
  'Sri', 'Dewi', 'Rina', 'Fitri', 'Wulan', 'Yulia', 'Indah', 'Lestari',
  'Mega', 'Nadia', 'Okta', 'Puspa', 'Ratna', 'Sinta', 'Tika', 'Ulfa',
  'Vera', 'Wati', 'Yanti', 'Zahra', 'Ayu', 'Bella', 'Citra', 'Diana',
  'Erna', 'Farah', 'Gita', 'Hana', 'Ira', 'Kirana',
], rand)
let maleIdx = 0
let femaleIdx = 0
function randomName(gender: 'MALE' | 'FEMALE'): string {
  return gender === 'MALE' ? MALE_NAMES[maleIdx++]! : FEMALE_NAMES[femaleIdx++]!
}

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.relationshipEdge.deleteMany()
  await prisma.personPhoto.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.personNode.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.nikLink.deleteMany()
  await prisma.nikIdentity.deleteMany()
  await prisma.familyGroup.deleteMany()
  await prisma.account.deleteMany()

  console.log('✓ Cleared existing data')

  const admin = await prisma.account.create({
    data: { email: ADMIN_EMAIL, isAdmin: true },
  })

  const familyGroup = await prisma.familyGroup.create({
    data: {
      name:        'Keluarga Besar Sadikin',
      description: 'Extended family of Aminah & Muniáh',
      adminAccountId: admin.id,
    },
  })
  const g = familyGroup.id

  // NIKs are sequential dummy values (0000000000000001 …) — not real NIKs.
  // Format: pad(n, 16) where n increments for each member in seed order.
  let nikCounter = 0
  const nextNik = () => String(++nikCounter).padStart(16, '0')

  const member = async (opts: {
    displayName:  string
    gender:       'MALE' | 'FEMALE'
    surname?:     string
    birthDate:    Date
    birthPlace:   string
    isDeceased?:  boolean
    deathDate?:   Date
  }) => {
    const nik = nextNik()
    await prisma.nikIdentity.create({ data: { nik, status: 'ACTIVE' } })
    return prisma.personNode.create({
      data: {
        nikId:         nik,
        displayName:   opts.displayName,
        gender:        opts.gender,
        surname:       opts.surname ?? null,
        birthDate:     opts.birthDate,
        birthPlace:    opts.birthPlace,
        isDeceased:    opts.isDeceased ?? false,
        deathDate:     opts.deathDate ?? null,
        familyGroupId: g,
      },
    })
  }

  /** Same as member(), but with a randomized display name/nickname (gender/dates/relations untouched). */
  const randomMember = (opts: {
    gender:       'MALE' | 'FEMALE'
    birthDate:    Date
    birthPlace:   string
    isDeceased?:  boolean
    deathDate?:   Date
  }) => {
    const name = randomName(opts.gender)
    return member({ ...opts, displayName: name, surname: name })
  }

  const rel = (
    type: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING',
    src:  string,
    tgt:  string,
    extra?: object,
  ) => prisma.relationshipEdge.create({
    data: { relationshipType: type, sourceId: src, targetId: tgt, ...extra },
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 0 — Uyut (great-great-grandparents)
  // ══════════════════════════════════════════════════════════════════════════

  const aminah = await randomMember({
    gender: 'MALE',   birthDate: new Date('1920-01-01'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('1990-06-15'),
  })
  const muniah = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1925-06-01'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('1995-03-20'),
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 1 — Aki / Nenek (children of Aminah + Muniáh, and their spouses)
  // ══════════════════════════════════════════════════════════════════════════

  const sadikin = await randomMember({
    gender: 'MALE',   birthDate: new Date('1940-03-15'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2010-08-22'),
  })
  const nani = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1944-07-11'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2015-03-08'),
  })

  const omang = await randomMember({
    gender: 'MALE',   birthDate: new Date('1942-07-20'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2012-11-04'),
  })
  const idik = await randomMember({
    gender: 'MALE',   birthDate: new Date('1944-11-05'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2015-02-17'),
  })
  const nEmi = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1946-04-12'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2018-09-30'),
  })
  const nTalon = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1948-09-08'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2020-05-12'),
  })

  // Emun + Endang
  const emun = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1950-02-14'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2019-07-03'),
  })
  const endang = await randomMember({
    gender: 'MALE',   birthDate: new Date('1948-05-22'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2016-12-01'),
  })

  // Emin + Ono (†) + Yono
  const emin = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1952-08-17'), birthPlace: 'Jawa Barat',
  })
  const ono = await randomMember({
    gender: 'MALE',   birthDate: new Date('1945-10-03'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2000-04-19'),
  })
  const yono = await randomMember({
    gender: 'MALE',   birthDate: new Date('1950-03-25'), birthPlace: 'Jawa Barat',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 2 — Wa / parent level
  // ══════════════════════════════════════════════════════════════════════════

  // Children of Emun + Endang
  const tato = await randomMember({
    gender: 'MALE',   birthDate: new Date('1970-09-01'), birthPlace: 'Bandung',
  })
  const santi = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1971-07-11'), birthPlace: 'Cimahi',
  })

  const rini = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1972-04-20'), birthPlace: 'Bandung',
  })
  const rudiHo = await randomMember({
    gender: 'MALE',   birthDate: new Date('1970-02-28'), birthPlace: 'Bandung',
  })

  const iwan = await randomMember({
    gender: 'MALE',   birthDate: new Date('1975-12-15'), birthPlace: 'Bandung',
  })

  // Child of Sadikin + Nani — older branch that leads to Gen 5
  const tatang = await randomMember({
    gender: 'MALE',   birthDate: new Date('1963-04-08'), birthPlace: 'Bandung',
  })
  const lisna = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1965-10-19'), birthPlace: 'Sumedang',
  })

  // Child of Emin + Ono
  const diding = await randomMember({
    gender: 'MALE',   birthDate: new Date('1968-06-12'), birthPlace: 'Bandung',
  })
  const astrid = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1970-08-30'), birthPlace: 'Bogor',
  })

  // Children of Emin + Yono
  const andi = await randomMember({
    gender: 'MALE',   birthDate: new Date('1972-03-07'), birthPlace: 'Bandung',
  })
  const eno = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1974-05-16'), birthPlace: 'Bekasi',
  })

  const retno = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1975-11-22'), birthPlace: 'Bandung',
  })
  const jati = await randomMember({
    gender: 'MALE',   birthDate: new Date('1973-01-19'), birthPlace: 'Sumedang',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 3 — grandchild level
  // ══════════════════════════════════════════════════════════════════════════

  // Children of Tato + Santi
  const andika = await randomMember({
    gender: 'MALE',   birthDate: new Date('1993-03-12'), birthPlace: 'Bandung',
  })
  const siska = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1993-02-14'), birthPlace: 'Cimahi',
  })

  const pipit = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1995-09-05'), birthPlace: 'Bandung',
  })
  const agus = await randomMember({
    gender: 'MALE',   birthDate: new Date('1993-06-22'), birthPlace: 'Garut',
  })

  // Children of Rini + Rudi
  const adya = await randomMember({
    gender: 'MALE',   birthDate: new Date('1994-11-21'), birthPlace: 'Bandung',
  })
  const alya = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1997-06-08'), birthPlace: 'Bandung',
  })

  // Child of Tatang + Lisna — the branch leading to Gen 5
  const cahya = await randomMember({
    gender: 'MALE',   birthDate: new Date('1985-07-14'), birthPlace: 'Bandung',
  })
  const rima = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1987-11-02'), birthPlace: 'Garut',
  })

  // Children of Diding + Astrid — Favian keeps his real name; his sibling is randomized
  const favian = await member({
    displayName: 'Favian Izza Diasputra', surname: 'Vian',
    gender: 'MALE',   birthDate: new Date('1998-01-10'), birthPlace: 'Bandung',
  })
  const saffa = await randomMember({
    gender: 'FEMALE', birthDate: new Date('2001-07-25'), birthPlace: 'Bandung',
  })

  // Children of Andi + Eno
  const dino = await randomMember({
    gender: 'MALE',   birthDate: new Date('1997-04-15'), birthPlace: 'Bekasi',
  })
  const mira = await randomMember({
    gender: 'FEMALE', birthDate: new Date('1999-08-23'), birthPlace: 'Jakarta',
  })

  const noy = await randomMember({
    gender: 'FEMALE', birthDate: new Date('2000-09-12'), birthPlace: 'Bekasi',
  })
  const andin = await randomMember({
    gender: 'FEMALE', birthDate: new Date('2002-12-03'), birthPlace: 'Bekasi',
  })

  // Children of Retno + Jati
  const afnan = await randomMember({
    gender: 'MALE',   birthDate: new Date('2000-08-17'), birthPlace: 'Sumedang',
  })
  const afika = await randomMember({
    gender: 'FEMALE', birthDate: new Date('2003-05-24'), birthPlace: 'Sumedang',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 4
  // ══════════════════════════════════════════════════════════════════════════

  // Child of Pipit + Agus
  const naya = await randomMember({
    gender: 'FEMALE', birthDate: new Date('2020-11-07'), birthPlace: 'Bandung',
  })

  // Child of Andika + Siska
  const raka = await randomMember({
    gender: 'MALE',   birthDate: new Date('2019-05-03'), birthPlace: 'Bandung',
  })

  // Children of Cahya + Rima — the oldest Gen 4, able to be parents
  const dzaky = await randomMember({
    gender: 'MALE',   birthDate: new Date('2006-02-18'), birthPlace: 'Bandung',
  })
  const putri = await randomMember({
    gender: 'FEMALE', birthDate: new Date('2007-06-09'), birthPlace: 'Bandung',
  })

  // Child of Dino + Mira
  const azka = await randomMember({
    gender: 'MALE',   birthDate: new Date('2023-03-15'), birthPlace: 'Bekasi',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 5 — children of Dzaky + Putri (great-great-great-grandchildren)
  // ══════════════════════════════════════════════════════════════════════════

  const rayyan = await randomMember({
    gender: 'MALE',   birthDate: new Date('2025-01-20'), birthPlace: 'Bandung',
  })
  const arsa = await randomMember({
    gender: 'FEMALE', birthDate: new Date('2026-02-14'), birthPlace: 'Bandung',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIPS (unchanged — same graph as before, just anonymized names)
  // ══════════════════════════════════════════════════════════════════════════

  // Gen 0 couple
  await rel('SPOUSE', aminah.id, muniah.id, { marriageDate: new Date('1939-04-10') })

  // Gen 0 → Gen 1 (7 blood children of Aminah + Muniáh)
  for (const child of [sadikin, omang, idik, nEmi, nTalon, emun, emin]) {
    await rel('PARENT_CHILD', aminah.id, child.id)
    await rel('PARENT_CHILD', muniah.id, child.id)
  }

  // Gen 1 couples
  await rel('SPOUSE', sadikin.id, nani.id,   { marriageDate: new Date('1962-08-17') })
  await rel('SPOUSE', endang.id,  emun.id,   { marriageDate: new Date('1968-05-17') })
  await rel('SPOUSE', ono.id,     emin.id,   { marriageDate: new Date('1966-09-20') })
  await rel('SPOUSE', yono.id,    emin.id,   { marriageDate: new Date('2003-01-15') })

  // Gen 1 → Gen 2
  // Sadikin + Nani → Tatang
  await rel('PARENT_CHILD', sadikin.id, tatang.id)
  await rel('PARENT_CHILD', nani.id,    tatang.id)
  // Emun + Endang → Tato, Rini, Iwan
  for (const id of [tato.id, rini.id, iwan.id]) {
    await rel('PARENT_CHILD', emun.id,   id)
    await rel('PARENT_CHILD', endang.id, id)
  }
  // Emin + Ono → Diding
  await rel('PARENT_CHILD', emin.id, diding.id)
  await rel('PARENT_CHILD', ono.id,  diding.id)
  // Emin + Yono → Andi, Retno
  for (const id of [andi.id, retno.id]) {
    await rel('PARENT_CHILD', emin.id, id)
    await rel('PARENT_CHILD', yono.id, id)
  }

  // Gen 2 couples
  await rel('SPOUSE', tato.id,   santi.id,  { marriageDate: new Date('1992-03-08') })
  await rel('SPOUSE', rudiHo.id, rini.id,   { marriageDate: new Date('1993-11-25') })
  await rel('SPOUSE', tatang.id, lisna.id,  { marriageDate: new Date('1984-02-21') })
  await rel('SPOUSE', diding.id, astrid.id, { marriageDate: new Date('1996-08-17') })
  await rel('SPOUSE', andi.id,   eno.id,    { marriageDate: new Date('1996-02-14') })
  await rel('SPOUSE', jati.id,   retno.id,  { marriageDate: new Date('1999-07-07') })

  // Gen 2 → Gen 3
  for (const id of [andika.id, pipit.id]) {
    await rel('PARENT_CHILD', tato.id,  id)
    await rel('PARENT_CHILD', santi.id, id)
  }
  for (const id of [adya.id, alya.id]) {
    await rel('PARENT_CHILD', rudiHo.id, id)
    await rel('PARENT_CHILD', rini.id,   id)
  }
  // Tatang + Lisna → Cahya
  await rel('PARENT_CHILD', tatang.id, cahya.id)
  await rel('PARENT_CHILD', lisna.id,  cahya.id)
  for (const id of [favian.id, saffa.id]) {
    await rel('PARENT_CHILD', diding.id, id)
    await rel('PARENT_CHILD', astrid.id, id)
  }
  for (const id of [dino.id, noy.id, andin.id]) {
    await rel('PARENT_CHILD', andi.id, id)
    await rel('PARENT_CHILD', eno.id,  id)
  }
  for (const id of [afnan.id, afika.id]) {
    await rel('PARENT_CHILD', jati.id,  id)
    await rel('PARENT_CHILD', retno.id, id)
  }

  // Gen 3 couples
  await rel('SPOUSE', andika.id, siska.id, { marriageDate: new Date('2018-06-10') })
  await rel('SPOUSE', agus.id,   pipit.id, { marriageDate: new Date('2019-09-21') })
  await rel('SPOUSE', cahya.id,  rima.id,  { marriageDate: new Date('2007-03-15') })
  await rel('SPOUSE', dino.id,   mira.id,  { marriageDate: new Date('2022-11-05') })

  // Gen 3 → Gen 4
  await rel('PARENT_CHILD', agus.id,   naya.id)
  await rel('PARENT_CHILD', pipit.id,  naya.id)
  await rel('PARENT_CHILD', andika.id, raka.id)
  await rel('PARENT_CHILD', siska.id,  raka.id)
  await rel('PARENT_CHILD', cahya.id,  dzaky.id)
  await rel('PARENT_CHILD', rima.id,   dzaky.id)
  await rel('PARENT_CHILD', dino.id,   azka.id)
  await rel('PARENT_CHILD', mira.id,   azka.id)

  // Gen 4 couple
  await rel('SPOUSE', dzaky.id, putri.id, { marriageDate: new Date('2024-08-10') })

  // Gen 4 → Gen 5
  await rel('PARENT_CHILD', dzaky.id, rayyan.id)
  await rel('PARENT_CHILD', putri.id, rayyan.id)
  await rel('PARENT_CHILD', dzaky.id, arsa.id)
  await rel('PARENT_CHILD', putri.id, arsa.id)

  // ══════════════════════════════════════════════════════════════════════════
  // ACCOUNT LINKING — Favian's own NIK is bound to the owner's personal email
  // ══════════════════════════════════════════════════════════════════════════

  const ownerAccount = await prisma.account.create({ data: { email: OWNER_EMAIL } })
  await prisma.nikLink.create({ data: { accountId: ownerAccount.id, nik: favian.nikId! } })

  console.log('✓ Created family: Keluarga Besar Sadikin (49 members, names randomized)')
  console.log('')
  console.log(`  Admin account:  ${ADMIN_EMAIL} (owns the family, sign in with Google to reach /admin)`)
  console.log(`  Personal account: ${OWNER_EMAIL} — linked to Favian Izza Diasputra (NIK ${favian.nikId})`)
  console.log('  Everyone else has zero linked Google accounts — link real emails via the admin interface.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => { void prisma.$disconnect() })
