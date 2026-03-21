import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.relationshipEdge.deleteMany()
  await prisma.personPhoto.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.personNode.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.user.deleteMany()
  await prisma.familyGroup.deleteMany()

  console.log('✓ Cleared existing data')

  const passwordHash = await argon2.hash('password123')

  const familyGroup = await prisma.familyGroup.create({
    data: { name: 'Keluarga Besar Sadikin', description: 'Extended family of Aminah & Muniáh' },
  })
  const g = familyGroup.id

  const member = async (opts: {
    nik:          string
    role?:        'FAMILY_HEAD' | 'FAMILY_MEMBER'
    displayName:  string
    gender:       'MALE' | 'FEMALE'
    surname?:     string       // nickname / nama panggilan
    birthDate:    Date
    birthPlace:   string
    isDeceased?:  boolean
    deathDate?:   Date
  }) => {
    const u = await prisma.user.create({
      data: {
        nik:          opts.nik,
        passwordHash,
        role:         opts.role ?? 'FAMILY_MEMBER',
        status:       'ACTIVE',
        personNodes: {
          create: {
            displayName:   opts.displayName,
            gender:        opts.gender,
            surname:       opts.surname ?? null,
            birthDate:     opts.birthDate,
            birthPlace:    opts.birthPlace,
            isDeceased:    opts.isDeceased ?? false,
            deathDate:     opts.deathDate ?? null,
            familyGroupId: g,
            role:          opts.role ?? 'FAMILY_MEMBER',
          },
        },
      },
      include: { personNodes: true },
    })
    return u.personNodes[0]!
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
  // GENERATION 0 — Uyut (great-grandparents)
  // ══════════════════════════════════════════════════════════════════════════

  const aminah = await member({
    nik: '3273010101200001',
    displayName: 'Aminah', surname: 'Uyut Cowo',
    gender: 'MALE',   birthDate: new Date('1920-01-01'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('1990-06-15'),
  })
  const muniah = await member({
    nik: '3273014106250002',
    displayName: "Muni'ah", surname: 'Uyut',
    gender: 'FEMALE', birthDate: new Date('1925-06-01'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('1995-03-20'),
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 1 — Aki / Nenek (grandparent level, children of Aminah+Muniáh)
  // ══════════════════════════════════════════════════════════════════════════

  const sadikin = await member({
    nik: '3273011503400003',
    displayName: 'Aki Sadikin', surname: 'Ikin',
    gender: 'MALE',   birthDate: new Date('1940-03-15'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2010-08-22'),
  })
  const omang = await member({
    nik: '3273012007420004',
    displayName: 'Aki Omang', surname: 'Omang',
    gender: 'MALE',   birthDate: new Date('1942-07-20'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2012-11-04'),
  })
  const idik = await member({
    nik: '3273010511440005',
    displayName: 'Aki Idik', surname: 'Idik',
    gender: 'MALE',   birthDate: new Date('1944-11-05'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2015-02-17'),
  })
  const nEmi = await member({
    nik: '3273015204460006',
    displayName: 'Nenek Emi', surname: 'Emi',
    gender: 'FEMALE', birthDate: new Date('1946-04-12'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2018-09-30'),
  })
  const nTalon = await member({
    nik: '3273014809480007',
    displayName: 'Nenek Talon', surname: 'Talon',
    gender: 'FEMALE', birthDate: new Date('1948-09-08'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2020-05-12'),
  })

  // Emun Muniáh — married to Aki Endang
  const emun = await member({
    nik: '3273015402500008',
    displayName: "Emun Munia'h", surname: 'Emun',
    gender: 'FEMALE', birthDate: new Date('1950-02-14'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2019-07-03'),
  })
  const endang = await member({
    nik: '3273012205480010',
    displayName: 'Aki Endang', surname: 'Endang',
    gender: 'MALE',   birthDate: new Date('1948-05-22'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2016-12-01'),
  })

  // Emin Muáminah — married first to Ono (deceased), then to Yono
  const emin = await member({
    nik: '3273015708520009',
    displayName: "Emin Mu'minah", surname: 'Emin',
    gender: 'FEMALE', birthDate: new Date('1952-08-17'), birthPlace: 'Jawa Barat',
  })
  const ono = await member({
    nik: '3273011003450011',
    displayName: 'Ono Supratna', surname: 'Ono',
    gender: 'MALE',   birthDate: new Date('1945-10-03'), birthPlace: 'Jawa Barat',
    isDeceased: true, deathDate: new Date('2000-04-19'),
  })
  const yono = await member({
    nik: '3273012503500012',
    displayName: 'Yono Budiono', surname: 'Yono',
    gender: 'MALE',   birthDate: new Date('1950-03-25'), birthPlace: 'Jawa Barat',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 2 — Wa / parent level (children of Gen 1)
  // ══════════════════════════════════════════════════════════════════════════

  // Children of Emun + Endang
  const tato = await member({
    nik: '3273010109700013',
    displayName: 'Sutisna Riyanto', surname: 'Tato',
    gender: 'MALE',   birthDate: new Date('1970-09-01'), birthPlace: 'Bandung',
  })
  const santi = await member({
    nik: '3273015107710019',
    displayName: 'Santi Kusumawati', surname: 'Santi',
    gender: 'FEMALE', birthDate: new Date('1971-07-11'), birthPlace: 'Cimahi',
  })

  const rini = await member({
    nik: '3273016004720014',
    displayName: 'Wa Rini', surname: 'Rini',
    gender: 'FEMALE', birthDate: new Date('1972-04-20'), birthPlace: 'Bandung',
  })
  const rudiHo = await member({
    nik: '3273012802700020',
    displayName: 'Rudi Ho', surname: 'Rudi',
    gender: 'MALE',   birthDate: new Date('1970-02-28'), birthPlace: 'Bandung',
  })

  const iwan = await member({
    nik: '3273011512750015',
    displayName: 'Wa Iwan', surname: 'Iwan',
    gender: 'MALE',   birthDate: new Date('1975-12-15'), birthPlace: 'Bandung',
  })

  // Child of Emin + Ono
  const diding = await member({
    nik: '3273011206680016',
    displayName: 'Diding Saefudin', surname: 'Diding',
    gender: 'MALE',   birthDate: new Date('1968-06-12'), birthPlace: 'Bandung',
  })
  const astrid = await member({
    nik: '3273017008700021',
    displayName: 'Astrid Wulandari', surname: 'Astrid',
    gender: 'FEMALE', birthDate: new Date('1970-08-30'), birthPlace: 'Bogor',
  })

  // Children of Emin + Yono
  const andi = await member({
    nik: '3273010703720017',
    role: 'FAMILY_HEAD',
    displayName: 'Andi Budiono', surname: 'Endis',
    gender: 'MALE',   birthDate: new Date('1972-03-07'), birthPlace: 'Bandung',
  })
  const eno = await member({
    nik: '3273015605740022',
    displayName: 'Eno Songkoyono', surname: 'Eno',
    gender: 'FEMALE', birthDate: new Date('1974-05-16'), birthPlace: 'Bekasi',
  })

  const retno = await member({
    nik: '3273016211750018',
    displayName: 'Retno Budiyati', surname: 'Enok',
    gender: 'FEMALE', birthDate: new Date('1975-11-22'), birthPlace: 'Bandung',
  })
  const jati = await member({
    nik: '3273011901730023',
    displayName: 'Om Jati Sejati', surname: 'Jati',
    gender: 'MALE',   birthDate: new Date('1973-01-19'), birthPlace: 'Sumedang',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 3 — grandchild level
  // ══════════════════════════════════════════════════════════════════════════

  // Children of Tato + Santi
  const andika = await member({
    nik: '3273011203930024',
    displayName: 'Andika', surname: 'Andika',
    gender: 'MALE',   birthDate: new Date('1993-03-12'), birthPlace: 'Bandung',
  })
  const siska = await member({
    nik: '3273015402930035',
    displayName: 'Siska Andriani', surname: 'Siska',
    gender: 'FEMALE', birthDate: new Date('1993-02-14'), birthPlace: 'Cimahi',
  })

  const pipit = await member({
    nik: '3273014509950025',
    displayName: 'Pipit', surname: 'Pipit',
    gender: 'FEMALE', birthDate: new Date('1995-09-05'), birthPlace: 'Bandung',
  })
  const agus = await member({
    nik: '3273012206930036',
    displayName: 'Agus Sujatmiko', surname: 'Agus',
    gender: 'MALE',   birthDate: new Date('1993-06-22'), birthPlace: 'Garut',
  })

  // Children of Rini + Rudi
  const adya = await member({
    nik: '3273012111940026',
    displayName: 'Adya', surname: 'Adya',
    gender: 'MALE',   birthDate: new Date('1994-11-21'), birthPlace: 'Bandung',
  })
  const alya = await member({
    nik: '3273014806970027',
    displayName: 'Alya Ariesta Riyantina', surname: 'Alya',
    gender: 'FEMALE', birthDate: new Date('1997-06-08'), birthPlace: 'Bandung',
  })

  // Children of Diding + Astrid
  const favian = await member({
    nik: '3273011001980028',
    displayName: 'Favian Izza Diasputra', surname: 'Vian',
    gender: 'MALE',   birthDate: new Date('1998-01-10'), birthPlace: 'Bandung',
  })
  const saffa = await member({
    nik: '3273016507010029',
    displayName: 'Saffanah Elvaretta Diasputri', surname: 'Saffa',
    gender: 'FEMALE', birthDate: new Date('2001-07-25'), birthPlace: 'Bandung',
  })

  // Children of Andi + Eno
  const dino = await member({
    nik: '3273011504970030',
    displayName: 'Eldino Muhammad Rafif', surname: 'Dino',
    gender: 'MALE',   birthDate: new Date('1997-04-15'), birthPlace: 'Bekasi',
  })
  const noy = await member({
    nik: '3273015209000031',
    displayName: 'Anne Akeyla Aishabira', surname: 'Noy',
    gender: 'FEMALE', birthDate: new Date('2000-09-12'), birthPlace: 'Bekasi',
  })
  const andin = await member({
    nik: '3273014312020032',
    displayName: 'Andin Akeyla Aishabira', surname: 'Andin',
    gender: 'FEMALE', birthDate: new Date('2002-12-03'), birthPlace: 'Bekasi',
  })

  // Children of Retno + Jati
  const afnan = await member({
    nik: '3273011708000033',
    displayName: 'Afnan The Waffles', surname: 'Afnan',
    gender: 'MALE',   birthDate: new Date('2000-08-17'), birthPlace: 'Sumedang',
  })
  const afika = await member({
    nik: '3273016405030034',
    displayName: 'Afika Akeyla Aishabira', surname: 'Afika',
    gender: 'FEMALE', birthDate: new Date('2003-05-24'), birthPlace: 'Sumedang',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATION 4
  // ══════════════════════════════════════════════════════════════════════════

  // Child of Pipit + Agus
  const naya = await member({
    nik: '3273014711200037',
    displayName: 'Naya', surname: 'Naya',
    gender: 'FEMALE', birthDate: new Date('2020-11-07'), birthPlace: 'Bandung',
  })

  // ══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIPS
  // ══════════════════════════════════════════════════════════════════════════

  // Gen 0 couple
  await rel('SPOUSE', aminah.id, muniah.id, { marriageDate: new Date('1939-04-10') })

  // Gen 0 → Gen 1 (7 children of Aminah + Muniáh)
  for (const child of [sadikin, omang, idik, nEmi, nTalon, emun, emin]) {
    await rel('PARENT_CHILD', aminah.id, child.id)
    await rel('PARENT_CHILD', muniah.id, child.id)
  }

  // Gen 1 couples
  await rel('SPOUSE', endang.id,  emun.id,  { marriageDate: new Date('1968-05-17') })
  // Emin's two marriages: Ono first (deceased), then Yono
  await rel('SPOUSE', ono.id,     emin.id,  { marriageDate: new Date('1966-09-20') })
  await rel('SPOUSE', yono.id,    emin.id,  { marriageDate: new Date('2003-01-15') })

  // Gen 1 → Gen 2
  for (const id of [tato.id, rini.id, iwan.id]) {
    await rel('PARENT_CHILD', emun.id,   id)
    await rel('PARENT_CHILD', endang.id, id)
  }
  await rel('PARENT_CHILD', emin.id, diding.id)
  await rel('PARENT_CHILD', ono.id,  diding.id)
  for (const id of [andi.id, retno.id]) {
    await rel('PARENT_CHILD', emin.id, id)
    await rel('PARENT_CHILD', yono.id, id)
  }

  // Gen 2 couples
  await rel('SPOUSE', tato.id,   santi.id,  { marriageDate: new Date('1992-03-08') })
  await rel('SPOUSE', rudiHo.id, rini.id,   { marriageDate: new Date('1993-11-25') })
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

  // Gen 3 → Gen 4
  await rel('PARENT_CHILD', agus.id,  naya.id)
  await rel('PARENT_CHILD', pipit.id, naya.id)

  console.log('✓ Created family: Keluarga Besar Sadikin')
  console.log('')
  console.log('  Gen 0 : Aminah (Uyut Cowo) ↔ Muniáh (Uyut)')
  console.log('  Gen 1 : Sadikin | Omang | Idik | Nenek Emi | Nenek Talon')
  console.log('          Emun↔Endang | Emin↔Ono(†)↔Yono')
  console.log('  Gen 2 : Tato↔Santi | Rini↔Rudi | Iwan')
  console.log('          Diding↔Astrid | Andi↔Eno | Retno↔Jati')
  console.log('  Gen 3 : Andika↔Siska | Pipit↔Agus | Adya | Alya')
  console.log('          Favian (Vian) | Saffa | Dino | Noy | Andin | Afnan | Afika')
  console.log('  Gen 4 : Naya')
  console.log('')
  console.log('  37 family members, all with NIK user accounts (password: password123)')
  console.log('  Family Head login: NIK 3273010703720017 / password123 (Andi Budiono)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => { void prisma.$disconnect() })
