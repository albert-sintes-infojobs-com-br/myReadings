import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  CreateRewardUseCase,
  DeleteRewardUseCase,
  GetRewardUseCase,
  ListRewardsUseCase,
  UpdateRewardUseCase,
} from '../../domain/rewards/use-cases';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/**
 * Transporte HTTP de Recompensas (Fase 7).
 *
 * Sin prefijo único de controller: `POST` cuelga de `/books/:bookId/rewards`
 * y el resto de `/rewards/*`, tal como documenta 06-api-endpoints.md.
 */
@ApiTags('rewards')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class RewardsController {
  constructor(
    private readonly createUc: CreateRewardUseCase,
    private readonly listUc: ListRewardsUseCase,
    private readonly getUc: GetRewardUseCase,
    private readonly updateUc: UpdateRewardUseCase,
    private readonly removeUc: DeleteRewardUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Post('books/:bookId/rewards')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Crea una recompensa sobre un libro de un hijo propio (solo padre).' })
  async createOne(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: CreateRewardDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.createUc.execute(actor, bookId, dto);
  }

  @Get('rewards')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Lista recompensas (padre: de sus hijos; hijo: las suyas).' })
  async list(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    return this.listUc.execute(actor);
  }

  @Get('rewards/:id')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Detalle de una recompensa (ámbito por rol).' })
  async get(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.getUc.execute(actor, id);
  }

  @Patch('rewards/:id')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Edita una recompensa (solo padre; libro debe seguir NOT_STARTED).' })
  async updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.updateUc.execute(actor, id, dto);
  }

  @Delete('rewards/:id')
  @Roles([Role.PARENT])
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una recompensa (solo padre; libro debe seguir NOT_STARTED).' })
  async deleteOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    await this.removeUc.execute(actor, id);
  }
}
