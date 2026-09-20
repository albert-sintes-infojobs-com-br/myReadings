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
  CreateGoalUseCase,
  DeleteGoalUseCase,
  ListChildGoalsUseCase,
  ListMyGoalsUseCase,
  UpdateGoalUseCase,
} from '../../domain/goals/use-cases';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/**
 * Transporte HTTP de Metas (Fase 6).
 *
 * Sin prefijo único de controller: las rutas cuelgan de `/children/:childId/goals`
 * (padre) y de `/goals/*` (padre y hijo), tal como documenta 06-api-endpoints.md.
 */
@ApiTags('goals')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class GoalsController {
  constructor(
    private readonly createUc: CreateGoalUseCase,
    private readonly listChildUc: ListChildGoalsUseCase,
    private readonly listMineUc: ListMyGoalsUseCase,
    private readonly updateUc: UpdateGoalUseCase,
    private readonly removeUc: DeleteGoalUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Post('children/:childId/goals')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Crea una meta para un hijo propio (solo padre).' })
  async createOne(
    @Param('childId', ParseIntPipe) childId: number,
    @Body() dto: CreateGoalDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.createUc.execute(actor, childId, dto);
  }

  @Get('children/:childId/goals')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Lista las metas de un hijo propio (solo padre).' })
  async listByChild(
    @Param('childId', ParseIntPipe) childId: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.listChildUc.execute(actor, childId);
  }

  @Get('goals/mine')
  @Roles([Role.CHILD])
  @ApiOperation({ summary: 'Lista mis propias metas (solo hijo).' })
  async listMine(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    return this.listMineUc.execute(actor);
  }

  @Patch('goals/:id')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Edita una meta (solo padre, hijo propio).' })
  async updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGoalDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.updateUc.execute(actor, id, dto);
  }

  @Delete('goals/:id')
  @Roles([Role.PARENT])
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una meta ACTIVE (solo padre, hijo propio).' })
  async deleteOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    await this.removeUc.execute(actor, id);
  }
}
