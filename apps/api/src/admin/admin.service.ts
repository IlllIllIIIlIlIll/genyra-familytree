import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import * as ExcelJS from 'exceljs'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { AuditService } from '../audit/audit.service'
import type {
  FamilyGroup,
  PersonNode,
  RelationshipEdge,
  AuditLogEntry,
  CreateAdminFamilyGroupDto,
  CreateNikIdentityDto,
  CreatePersonNodeDto,
  UpdatePersonNodeDto,
  CreateRelationshipDto,
} from '@genyra/shared-types'

const MAX_NIK_LINKS_PER_ACCOUNT = 5
const MAX_ACCOUNTS_PER_NIK      = 2
const MAX_NIK_FAMILIES          = 3
const MAX_FAMILY_SIZE           = 500

export interface AdminMember {
  node:           PersonNode
  nik:            string | null
  status:         'ACTIVE' | 'DEACTIVATED' | null
  linkedAccounts: Array<{ id: string; email: string; hasLoggedIn: boolean }>
}

function sanitizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('https://')) return url
  return null
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // ── Family ──────────────────────────────────────────────────────────────

  async getMyFamily(accountId: string): Promise<FamilyGroup> {
    const group = await this.prisma.familyGroup.findUnique({ where: { adminAccountId: accountId } })
    if (!group) throw new NotFoundException('You do not own a family yet')
    return this.toFamilyGroupDto(group)
  }

  async createFamily(accountId: string, dto: CreateAdminFamilyGroupDto): Promise<FamilyGroup> {
    const existing = await this.prisma.familyGroup.findUnique({ where: { adminAccountId: accountId } })
    if (existing) throw new BadRequestException('You already own a family')

    const group = await this.prisma.familyGroup.create({
      data: { name: dto.name, description: dto.description ?? null, adminAccountId: accountId },
    })
    await this.audit.log({ familyGroupId: group.id, actorAccountId: accountId, action: 'FAMILY_CREATED', details: dto.name })
    return this.toFamilyGroupDto(group)
  }

  async updateFamily(accountId: string, name: string): Promise<FamilyGroup> {
    const group = await this.requireFamily(accountId)
    const trimmed = name.trim()
    if (!trimmed) throw new BadRequestException('Family name cannot be empty')
    const updated = await this.prisma.familyGroup.update({ where: { id: group.id }, data: { name: trimmed } })
    await this.audit.log({ familyGroupId: group.id, actorAccountId: accountId, action: 'FAMILY_RENAMED', details: trimmed })
    return this.toFamilyGroupDto(updated)
  }

  async deleteFamily(accountId: string): Promise<{ message: string }> {
    const group = await this.requireFamily(accountId)
    await this.audit.log({ familyGroupId: group.id, actorAccountId: accountId, action: 'FAMILY_DELETED' })
    await this.prisma.$transaction(async (tx) => {
      await tx.relationshipEdge.deleteMany({ where: { source: { familyGroupId: group.id } } })
      await tx.personNode.deleteMany({ where: { familyGroupId: group.id } })
      await tx.notification.deleteMany({ where: { familyGroupId: group.id } })
      await tx.leaveRequest.deleteMany({ where: { familyGroupId: group.id } })
      await tx.familyGroup.delete({ where: { id: group.id } })
    })
    return { message: 'Family deleted successfully.' }
  }

  // ── Members (PersonNode + NikIdentity + linked Accounts) ──────────────────

  async listMembers(accountId: string): Promise<AdminMember[]> {
    const group = await this.requireFamily(accountId)
    const nodes = await this.prisma.personNode.findMany({
      where: { familyGroupId: group.id },
      include: { identity: { include: { nikLinks: { include: { account: true } } } } },
      orderBy: { createdAt: 'asc' },
    })
    return nodes.map((n) => ({
      node: this.toPersonNodeDto(n),
      nik: n.identity?.nik ?? null,
      status: n.identity?.status ?? null,
      linkedAccounts: (n.identity?.nikLinks ?? []).map((l) => ({
        id: l.account.id,
        email: l.account.email,
        hasLoggedIn: l.account.googleId !== null,
      })),
    }))
  }

  async createNikIdentity(accountId: string, dto: CreateNikIdentityDto): Promise<PersonNode> {
    const group = await this.requireFamily(accountId)
    await this.assertFamilyNotFull(group.id)

    const existing = await this.prisma.nikIdentity.findUnique({ where: { nik: dto.nik } })
    if (existing) {
      const alreadyInFamily = await this.prisma.personNode.findFirst({
        where: { nikId: dto.nik, familyGroupId: group.id },
      })
      if (alreadyInFamily) throw new ConflictException('This NIK is already a member of your family')

      const familyCount = await this.prisma.personNode.count({ where: { nikId: dto.nik } })
      if (familyCount >= MAX_NIK_FAMILIES) {
        throw new BadRequestException(`This NIK already belongs to the maximum of ${MAX_NIK_FAMILIES} families`)
      }
    } else {
      await this.prisma.nikIdentity.create({ data: { nik: dto.nik, status: 'ACTIVE' } })
    }

    const node = await this.prisma.personNode.create({
      data: {
        nikId:         dto.nik,
        familyGroupId: group.id,
        displayName:   dto.displayName,
        gender:        dto.gender ?? null,
        surname:       dto.surname ?? null,
        birthDate:     dto.birthDate ? new Date(dto.birthDate) : null,
        birthPlace:    dto.birthPlace ?? null,
        isDeceased:    dto.isDeceased ?? false,
        deathDate:     dto.deathDate ? new Date(dto.deathDate) : null,
      },
      include: { identity: true },
    })
    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'NIK_IDENTITY_CREATED',
      targetId: dto.nik, details: dto.displayName,
    })
    return this.toPersonNodeDto(node)
  }

  async setNikStatus(accountId: string, nik: string, status: 'ACTIVE' | 'DEACTIVATED'): Promise<void> {
    const group = await this.requireFamily(accountId)
    const identity = await this.prisma.nikIdentity.findUnique({ where: { nik } })
    if (!identity) throw new NotFoundException('NIK not found')
    await this.prisma.nikIdentity.update({ where: { nik }, data: { status } })
    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId,
      action: status === 'ACTIVE' ? 'NIK_ACTIVATED' : 'NIK_DEACTIVATED', targetId: nik,
    })
  }

  async linkAccount(accountId: string, nik: string, email: string): Promise<void> {
    const group = await this.requireFamily(accountId)

    const identity = await this.prisma.nikIdentity.findUnique({ where: { nik } })
    if (!identity) throw new NotFoundException('NIK not found')

    // The count-checks and the create must be atomic — otherwise two
    // concurrent link requests can both pass the count check before either
    // commits, exceeding MAX_ACCOUNTS_PER_NIK / MAX_NIK_LINKS_PER_ACCOUNT.
    await this.prisma.$transaction(async (tx) => {
      const nikLinkCount = await tx.nikLink.count({ where: { nik } })
      if (nikLinkCount >= MAX_ACCOUNTS_PER_NIK) {
        throw new BadRequestException(`A NIK can be linked to at most ${MAX_ACCOUNTS_PER_NIK} Google accounts`)
      }

      let account = await tx.account.findUnique({ where: { email } })
      if (account?.isAdmin) throw new BadRequestException('Admin accounts cannot hold NIK access')

      if (account) {
        const accountLinkCount = await tx.nikLink.count({ where: { accountId: account.id } })
        if (accountLinkCount >= MAX_NIK_LINKS_PER_ACCOUNT) {
          throw new BadRequestException(`A Google account can hold at most ${MAX_NIK_LINKS_PER_ACCOUNT} NIKs`)
        }
        const existingLink = await tx.nikLink.findUnique({
          where: { accountId_nik: { accountId: account.id, nik } },
        })
        if (existingLink) throw new ConflictException('This account is already linked to that NIK')
      } else {
        account = await tx.account.create({ data: { email } })
      }

      await tx.nikLink.create({ data: { accountId: account.id, nik } })
    })

    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'ACCOUNT_LINKED', targetId: nik, details: email,
    })
  }

  async unlinkAccount(accountId: string, nik: string, targetAccountId: string): Promise<void> {
    const group = await this.requireFamily(accountId)
    await this.prisma.nikLink.deleteMany({ where: { nik, accountId: targetAccountId } })
    await this.prisma.nikIdentity.updateMany({
      where: { nik, activeAccountId: targetAccountId },
      data:  { activeAccountId: null },
    })
    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'ACCOUNT_UNLINKED', targetId: nik, details: targetAccountId,
    })
  }

  // ── Person nodes (placeholders + edits) ────────────────────────────────────

  async createPersonNode(accountId: string, dto: CreatePersonNodeDto): Promise<PersonNode> {
    const group = await this.requireFamily(accountId)
    await this.assertFamilyNotFull(group.id)
    const node = await this.prisma.personNode.create({
      data: {
        displayName:   dto.displayName,
        gender:        dto.gender ?? null,
        surname:       dto.surname ?? null,
        birthDate:     dto.birthDate ? new Date(dto.birthDate) : null,
        birthPlace:    dto.birthPlace ?? null,
        deathDate:     dto.deathDate ? new Date(dto.deathDate) : null,
        bio:           dto.bio ?? null,
        avatarUrl:     dto.avatarUrl ?? null,
        isDeceased:    dto.isDeceased ?? false,
        isPlaceholder: dto.isPlaceholder ?? true,
        canvasX:       dto.canvasX ?? 0,
        canvasY:       dto.canvasY ?? 0,
        nikId:         dto.nikId ?? null,
        familyGroupId: group.id,
      },
      include: { identity: true },
    })
    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'PERSON_NODE_CREATED',
      targetId: node.id, details: dto.displayName,
    })
    return this.toPersonNodeDto(node)
  }

  async updatePersonNode(accountId: string, id: string, dto: UpdatePersonNodeDto): Promise<PersonNode> {
    const group = await this.requireFamily(accountId)
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node || node.familyGroupId !== group.id) throw new NotFoundException('Person node not found')

    const updated = await this.prisma.personNode.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.surname !== undefined && { surname: dto.surname }),
        ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
        ...(dto.birthPlace !== undefined && { birthPlace: dto.birthPlace }),
        ...(dto.deathDate !== undefined && { deathDate: dto.deathDate ? new Date(dto.deathDate) : null }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.isDeceased !== undefined && { isDeceased: dto.isDeceased }),
        ...(dto.isPlaceholder !== undefined && { isPlaceholder: dto.isPlaceholder }),
      },
      include: { identity: true },
    })

    if (dto.isDeceased === true && !node.isDeceased) {
      await this.prisma.notification.create({
        data: {
          familyGroupId: group.id,
          type:          'MEMBER_DECEASED',
          message:       `${node.displayName} has passed away. May their memory be cherished.`,
          personNodeId:  node.id,
        },
      })
      await this.notifications.pruneForFamily(group.id)
    }

    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'PERSON_NODE_UPDATED', targetId: id,
    })
    return this.toPersonNodeDto(updated)
  }

  async deletePersonNode(accountId: string, id: string): Promise<void> {
    const group = await this.requireFamily(accountId)
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node || node.familyGroupId !== group.id) throw new NotFoundException('Person node not found')
    await this.prisma.personNode.delete({ where: { id } })
    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'PERSON_NODE_DELETED',
      targetId: id, details: node.displayName,
    })
  }

  // ── Relationships ───────────────────────────────────────────────────────

  async createRelationship(accountId: string, dto: CreateRelationshipDto): Promise<RelationshipEdge> {
    const group = await this.requireFamily(accountId)

    const [sourceNode, targetNode] = await Promise.all([
      this.prisma.personNode.findUnique({ where: { id: dto.sourceId } }),
      this.prisma.personNode.findUnique({ where: { id: dto.targetId } }),
    ])
    if (!sourceNode || !targetNode || sourceNode.familyGroupId !== group.id || targetNode.familyGroupId !== group.id) {
      throw new ForbiddenException('Both nodes must belong to your family')
    }

    const existing = await this.prisma.relationshipEdge.findFirst({
      where: { sourceId: dto.sourceId, targetId: dto.targetId, relationshipType: dto.relationshipType },
    })
    if (existing) throw new ConflictException('Relationship already exists')

    if (dto.relationshipType === 'SPOUSE') {
      await this.assertNoLivingSpouse(sourceNode.id)
      await this.assertNoLivingSpouse(targetNode.id)
      await this.validateSpouseRules(sourceNode, targetNode)
    }

    const edge = await this.prisma.relationshipEdge.create({
      data: {
        relationshipType: dto.relationshipType,
        sourceId:     dto.sourceId,
        targetId:     dto.targetId,
        marriageDate: dto.marriageDate ? new Date(dto.marriageDate) : null,
        divorceDate:  dto.divorceDate  ? new Date(dto.divorceDate)  : null,
        notes:        dto.notes ?? null,
      },
    })
    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'RELATIONSHIP_CREATED',
      targetId: edge.id, details: `${dto.relationshipType}: ${dto.sourceId} -> ${dto.targetId}`,
    })
    return this.toRelationshipDto(edge)
  }

  async deleteRelationship(accountId: string, id: string): Promise<void> {
    const group = await this.requireFamily(accountId)
    const edge = await this.prisma.relationshipEdge.findUnique({
      where: { id },
      include: { source: { select: { familyGroupId: true } } },
    })
    if (!edge || edge.source.familyGroupId !== group.id) throw new NotFoundException('Relationship not found')
    await this.prisma.relationshipEdge.delete({ where: { id } })
    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'RELATIONSHIP_DELETED', targetId: id,
    })
  }

  // ── Leave requests ─────────────────────────────────────────────────────

  async getLeaveRequests(accountId: string): Promise<unknown[]> {
    const group = await this.requireFamily(accountId)
    const requests = await this.prisma.leaveRequest.findMany({
      where: { familyGroupId: group.id, status: 'PENDING' },
      include: { identity: { include: { personNodes: { where: { familyGroupId: group.id } } } } },
      orderBy: { createdAt: 'desc' },
    })
    return requests.map((r) => ({
      id:            r.id,
      nik:           r.nikId,
      displayName:   r.identity.personNodes[0]?.displayName ?? 'Unknown',
      familyGroupId: r.familyGroupId,
      status:        r.status,
      createdAt:     r.createdAt.toISOString(),
    }))
  }

  async processLeaveRequest(accountId: string, requestId: string, approve: boolean): Promise<{ message: string }> {
    const group = await this.requireFamily(accountId)
    const leaveRequest = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } })
    if (!leaveRequest || leaveRequest.familyGroupId !== group.id) throw new NotFoundException('Leave request not found')

    if (approve) {
      await this.prisma.$transaction(async (tx) => {
        await tx.leaveRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } })
        const node = await tx.personNode.findFirst({ where: { nikId: leaveRequest.nikId, familyGroupId: group.id } })
        if (node) await tx.personNode.delete({ where: { id: node.id } })
      })
      await this.audit.log({
        familyGroupId: group.id, actorAccountId: accountId, action: 'LEAVE_REQUEST_APPROVED',
        targetId: requestId, details: leaveRequest.nikId,
      })
      return { message: 'Member has been removed from the family.' }
    }
    await this.prisma.leaveRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } })
    await this.audit.log({
      familyGroupId: group.id, actorAccountId: accountId, action: 'LEAVE_REQUEST_REJECTED', targetId: requestId,
    })
    return { message: 'Leave request rejected.' }
  }

  // ── Audit log ───────────────────────────────────────────────────────────

  async getAuditLog(accountId: string): Promise<AuditLogEntry[]> {
    const group = await this.requireFamily(accountId)
    const entries = await this.audit.getForFamily(group.id)
    return entries.map((e) => ({
      id:             e.id,
      familyGroupId:  e.familyGroupId,
      actorAccountId: e.actorAccountId,
      action:         e.action,
      targetId:       e.targetId,
      details:        e.details,
      createdAt:      e.createdAt.toISOString(),
    }))
  }

  // ── Excel export ────────────────────────────────────────────────────────

  async exportMembersExcel(accountId: string): Promise<Buffer> {
    const members = await this.listMembers(accountId)

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Genyra'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Family Members')
    sheet.columns = [
      { header: 'Display Name', key: 'displayName', width: 28 },
      { header: 'Nickname',     key: 'surname',     width: 16 },
      { header: 'NIK',          key: 'nik',          width: 20 },
      { header: 'Gender',       key: 'gender',       width: 10 },
      { header: 'Birth Date',   key: 'birthDate',    width: 14 },
      { header: 'Birth Place',  key: 'birthPlace',   width: 18 },
      { header: 'Deceased',     key: 'isDeceased',   width: 10 },
      { header: 'Status',       key: 'status',       width: 14 },
      { header: 'Linked Emails', key: 'linkedEmails', width: 40 },
    ]
    sheet.getRow(1).font = { bold: true }

    for (const m of members) {
      sheet.addRow({
        displayName:  m.node.displayName,
        surname:      m.node.surname ?? '',
        nik:          m.nik ?? '',
        gender:       m.node.gender ?? '',
        birthDate:    m.node.birthDate?.slice(0, 10) ?? '',
        birthPlace:   m.node.birthPlace ?? '',
        isDeceased:   m.node.isDeceased ? 'Yes' : 'No',
        status:       m.status ?? '',
        linkedEmails: m.linkedAccounts.map((a) => a.email).join(', '),
      })
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(arrayBuffer)
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private async requireFamily(accountId: string): Promise<{ id: string }> {
    const group = await this.prisma.familyGroup.findUnique({ where: { adminAccountId: accountId } })
    if (!group) throw new NotFoundException('You do not own a family yet')
    return group
  }

  private async assertFamilyNotFull(familyGroupId: string): Promise<void> {
    const count = await this.prisma.personNode.count({ where: { familyGroupId } })
    if (count >= MAX_FAMILY_SIZE) {
      throw new BadRequestException(`A family can have at most ${MAX_FAMILY_SIZE} members`)
    }
  }

  private async assertNoLivingSpouse(nodeId: string): Promise<void> {
    const existingSpouseEdges = await this.prisma.relationshipEdge.findMany({
      where: {
        relationshipType: 'SPOUSE',
        divorceDate: null,
        OR: [{ sourceId: nodeId }, { targetId: nodeId }],
      },
      select: { sourceId: true, targetId: true },
    })
    for (const edge of existingSpouseEdges) {
      const partnerId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
      const partner = await this.prisma.personNode.findUnique({ where: { id: partnerId }, select: { isDeceased: true } })
      if (partner && !partner.isDeceased) {
        throw new BadRequestException('MARRIED: this person already has a living spouse')
      }
    }
  }

  private async validateSpouseRules(
    source: { id: string; gender: string | null; birthDate: Date | null },
    target: { id: string; gender: string | null; birthDate: Date | null },
  ): Promise<void> {
    if (source.gender !== null && target.gender !== null && source.gender === target.gender) {
      throw new BadRequestException('SAME_SEX: spouse nodes must be of opposite genders')
    }
    if (source.birthDate !== null && target.birthDate !== null) {
      const gap = Math.abs(source.birthDate.getFullYear() - target.birthDate.getFullYear())
      if (gap > 25) throw new BadRequestException(`AGE_GAP: birth-year difference is ${gap} years (max 25)`)
    }
    await this.assertNoCommonAncestor(source.id, target.id, 3)
  }

  private async collectAncestors(nodeId: string, maxDepth: number): Promise<Set<string>> {
    const ancestors = new Set<string>()
    let frontier = [nodeId]
    for (let depth = 0; depth < maxDepth; depth++) {
      if (frontier.length === 0) break
      const edges = await this.prisma.relationshipEdge.findMany({
        where: { relationshipType: 'PARENT_CHILD', targetId: { in: frontier } },
        select: { sourceId: true },
      })
      const parents = edges.map((e) => e.sourceId)
      const newParents = parents.filter((id) => !ancestors.has(id))
      newParents.forEach((id) => ancestors.add(id))
      frontier = newParents
    }
    return ancestors
  }

  private async assertNoCommonAncestor(idA: string, idB: string, maxGenerations: number): Promise<void> {
    const [ancestorsA, ancestorsB] = await Promise.all([
      this.collectAncestors(idA, maxGenerations),
      this.collectAncestors(idB, maxGenerations),
    ])
    for (const id of ancestorsA) {
      if (ancestorsB.has(id)) throw new BadRequestException('CONSANGUINITY: nodes share a blood ancestor within 3 generations')
    }
  }

  private toFamilyGroupDto(group: {
    id: string; name: string; description: string | null; adminAccountId: string; createdAt: Date
  }): FamilyGroup {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      adminAccountId: group.adminAccountId,
      createdAt: group.createdAt.toISOString(),
    }
  }

  private toPersonNodeDto(node: {
    id: string
    displayName: string
    gender: 'MALE' | 'FEMALE' | null
    surname: string | null
    birthDate: Date | null
    birthPlace: string | null
    deathDate: Date | null
    bio: string | null
    avatarUrl: string | null
    isDeceased: boolean
    isPlaceholder: boolean
    canvasX: number
    canvasY: number
    nikId: string | null
    familyGroupId: string | null
    createdAt: Date
    updatedAt: Date
  }): PersonNode {
    return {
      id: node.id,
      displayName: node.displayName,
      gender: node.gender ?? null,
      surname: node.surname ?? null,
      nik: node.nikId ?? null,
      birthDate: node.birthDate?.toISOString() ?? null,
      birthPlace: node.birthPlace,
      deathDate: node.deathDate?.toISOString() ?? null,
      bio: node.bio,
      avatarUrl: sanitizeAvatarUrl(node.avatarUrl),
      isDeceased: node.isDeceased,
      isPlaceholder: node.isPlaceholder,
      canvasX: node.canvasX,
      canvasY: node.canvasY,
      nikId: node.nikId,
      familyGroupId: node.familyGroupId,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    }
  }

  private toRelationshipDto(edge: {
    id: string; relationshipType: string; sourceId: string; targetId: string
    marriageDate: Date | null; divorceDate: Date | null; notes: string | null; createdAt: Date
  }): RelationshipEdge {
    return {
      id: edge.id,
      relationshipType: edge.relationshipType as RelationshipEdge['relationshipType'],
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      marriageDate: edge.marriageDate?.toISOString() ?? null,
      divorceDate: edge.divorceDate?.toISOString() ?? null,
      notes: edge.notes,
      createdAt: edge.createdAt.toISOString(),
    }
  }
}
