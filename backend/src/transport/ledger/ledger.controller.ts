import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
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
  GetChildLedgerUseCase,
  GetMyBalanceUseCase,
  RedeemGoalUseCase,
} from '../../domain/ledger/use-cases';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/**
 * Transporte HTTP del Ledger + canje de metas (Fase 8).
 *
 * Sin prefijo único: `/ledger/balance` (hijo), `/children/:childId/ledger`
 * (padre) y `/goals/:id/redeem` (padre), tal como documenta
 * 06-api-endpoints.md.
 */
@ApiTags('ledger')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class LedgerController {
  constructor(
    private readonly balanceUc: GetMyBalanceUseCase,
    private readonly childLedgerUc: GetChildLedgerUseCase,
    private readonly redeemUc: RedeemGoalUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Get('ledger/balance')
  @Roles([Role.CHILD])
  @ApiOperation({ summary: 'Saldo propio (puntos y euros) — solo hijo.' })
  async myBalance(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    return this.balanceUc.execute(actor);
  }

  @Get('children/:childId/ledger')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Movimientos y saldo de un hijo propio (solo padre).' })
  async childLedger(
    @Param('childId', ParseIntPipe) childId: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.childLedgerUc.execute(actor, childId);
  }

  @Post('goals/:id/redeem')
  @Roles([Role.PARENT])
  @HttpCode(200)
  @ApiOperation({ summary: 'Canjea una meta ACHIEVED (solo padre, hijo propio).' })
  async redeem(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.redeemUc.execute(actor, id);
  }
}
