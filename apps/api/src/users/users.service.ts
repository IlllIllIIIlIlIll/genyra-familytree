import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { User, MemberStatus } from '@genyra/shared-types'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { personNode: true },
    })
    if (!user || !user.personNode) throw new NotFoundException('User not found')
    return this.toUserDto(user, user.personNode)
  }

  async findPendingByGroup(familyGroupId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        personNode: { familyGroupId },
      },
      include: { personNode: true },
    })
    return users.map((u) => this.toUserDto(u, u.personNode!))
  }

  async updateStatus(userId: string, status: MemberStatus): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      include: { personNode: true },
    })
    return this.toUserDto(user, user.personNode!)
  }

  private toUserDto(
    user: {
      id: string
      nik: string
      role: string
      status: string
      createdAt: Date
    },
    node: {
      displayName: string
      gender: 'MALE' | 'FEMALE' | null
      surname: string | null
      birthDate: Date | null
      birthPlace: string | null
      familyGroupId: string | null
    },
  ): User {
    return {
      id: user.id,
      nik: user.nik,
      displayName: node.displayName,
      gender: (node.gender as User['gender']) ?? 'MALE',
      surname: node.surname ?? '',
      birthDate: node.birthDate?.toISOString() ?? '',
      birthPlace: node.birthPlace ?? '',
      role: user.role as User['role'],
      status: user.status as User['status'],
      familyGroupId: node.familyGroupId,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
