import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateRewardRequestUseCase,
  ListMyRewardRequestsUseCase,
  ListPendingRewardRequestsUseCase,
  ResolveRewardRequestUseCase,
} from '../../domain/reward-requests/use-cases';
import { ResolveRewardRequestDto } from './dto/resolve-reward-request.dto';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/**
 * Transporte HTTP de Solicitudes de recompensa (Fase 9).
 *
 * Sin prefijo único: `POST /books/:id/request-reward` (hijo) y
 * `/reward-requests/*` (padre), tal como documenta 06-api-endpoints.md.
 */
@ApiTags('reward-requests')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class RewardRequestsController {
  constructor(
    private readonly createUc: CreateRewardRequestUseCase,
    private readonly listUc: ListPendingRewardRequestsUseCase,
    private readonly listMineUc: ListMyRewardRequestsUseCase,
    private readonly resolveUc: ResolveRewardRequestUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Post('books/:id/request-reward')
  @Roles([Role.CHILD])
  @ApiOperation({ summary: 'Solicita una recompensa sobre un libro propio (solo hijo).' })
  async requestReward(
    @Param('id', ParseIntPipe) bookId: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.createUc.execute(actor, bookId);
  }

  @Get('reward-requests')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Lista solicitudes PENDING de todos sus hijos (solo padre).' })
  async list(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    return this.listUc.execute(actor);
  }

  @Get('reward-requests/mine')
  @Roles([Role.CHILD])
  @ApiOperation({ summary: 'Lista mis propias solicitudes de recompensa, cualquier status (solo hijo).' })
  async listMine(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    return this.listMineUc.execute(actor);
  }

  @Patch('reward-requests/:id')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Resuelve o descarta una solicitud (solo padre, hijo propio).' })
  async resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveRewardRequestDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.resolveUc.execute(actor, id, dto.status);
  }
}
