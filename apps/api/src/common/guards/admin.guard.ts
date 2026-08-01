import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { JwtPayload } from '../decorators/current-user.decorator'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user: JwtPayload }>()

    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Admin account required')
    }
    return true
  }
}
