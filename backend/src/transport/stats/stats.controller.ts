import { Controller, Get, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetMyStatsUseCase, GetOverviewStatsUseCase } from '../../domain/stats/use-cases';
import { OverviewStatsQueryDto } from './dto/overview-stats-query.dto';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/** Transporte HTTP de Estadísticas / Dashboards (Fase 10). */
@ApiTags('stats')
@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class StatsController {
  constructor(
    private readonly meUc: GetMyStatsUseCase,
    private readonly overviewUc: GetOverviewStatsUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Get('me')
  @Roles([Role.CHILD])
  @ApiOperation({ summary: 'Estadísticas del propio hijo (solo hijo).' })
  async me(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    return this.meUc.execute(actor);
  }

  @Get('overview')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Estadísticas agregadas (solo padre); sin childId agrega todos los hijos + ranking.' })
  async overview(
    @Query() query: OverviewStatsQueryDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.overviewUc.execute(actor, query.childId);
  }
}
