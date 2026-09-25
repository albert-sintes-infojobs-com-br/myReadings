import { Controller, Get, Param, ParseIntPipe, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ListChildBooksUseCase } from '../../domain/books/use-cases';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/**
 * Vista de solo lectura para el padre: `GET /children/:childId/books`
 * (mismo patrón que Goals/Ledger). No admite crear/editar/borrar.
 */
@ApiTags('books')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class ChildBooksController {
  constructor(
    private readonly listChildUc: ListChildBooksUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Get('children/:childId/books')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Lista los libros de un hijo propio, solo lectura (solo padre).' })
  async listByChild(
    @Param('childId', ParseIntPipe) childId: number,
    @Query() query: ListBooksQueryDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.listChildUc.execute(actor, childId, query);
  }
}
