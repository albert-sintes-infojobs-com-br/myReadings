import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
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
  CountUnreadNotificationsUseCase,
  ListMyNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from '../../domain/notifications/use-cases';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/** Transporte HTTP de Notificaciones in-app (Fase 9). Bandeja propia de cada usuario. */
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly listUc: ListMyNotificationsUseCase,
    private readonly countUc: CountUnreadNotificationsUseCase,
    private readonly markReadUc: MarkNotificationReadUseCase,
    private readonly markAllReadUc: MarkAllNotificationsReadUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Get()
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Lista las notificaciones propias (opcional: solo no leídas).' })
  async list(
    @Query() query: ListNotificationsQueryDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.listUc.execute(actor, query.unread);
  }

  @Get('unread-count')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Número de notificaciones no leídas.' })
  async unreadCount(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    const count = await this.countUc.execute(actor);
    return { count };
  }

  @Patch(':id/read')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Marca una notificación propia como leída.' })
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.markReadUc.execute(actor, id);
  }

  @Patch('read-all')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Marca todas las notificaciones propias como leídas.' })
  async markAllRead(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    const updated = await this.markAllReadUc.execute(actor);
    return { updated };
  }
}
