import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { JwtPayload } from '../common/decorators/current-user.decorator'
import type { User } from '@genyra/shared-types'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(requester: JwtPayload): Promise<User> {
    if (!requester.nik) throw new ForbiddenException('Not a personal account session')

    const identity = await this.prisma.nikIdentity.findUnique({ where: { nik: requester.nik } })
    if (!identity) throw new NotFoundException('NIK not found')

    const node = await this.prisma.personNode.findFirst({
      where: { nikId: requester.nik, ...(requester.fid ? { familyGroupId: requester.fid } : {}) },
      orderBy: { createdAt: 'asc' },
    })

    return {
      nik: identity.nik,
      status: identity.status,
      familyGroupId: node?.familyGroupId ?? null,
      displayName: node?.displayName ?? identity.nik,
      gender: node?.gender ?? null,
      surname: node?.surname ?? null,
      birthDate: node?.birthDate?.toISOString() ?? null,
      birthPlace: node?.birthPlace ?? null,
    }
  }
}
