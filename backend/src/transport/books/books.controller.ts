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
  CreateBookUseCase,
  DeleteBookUseCase,
  GetBookUseCase,
  ListBooksUseCase,
  UpdateBookUseCase,
} from '../../domain/books/use-cases';
import { ResolveBookFinishedUseCase } from '../../domain/ledger/use-cases';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/**
 * Transporte HTTP de Libros (Fase 5).
 *
 * A diferencia de categorías, un libro es SIEMPRE privado de su
 * propietario: no hay vista de solo-lectura hijo↔padre.
 */
@ApiTags('books')
@Controller('books')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class BooksController {
  constructor(
    private readonly listUc: ListBooksUseCase,
    private readonly getUc: GetBookUseCase,
    private readonly createUc: CreateBookUseCase,
    private readonly updateUc: UpdateBookUseCase,
    private readonly removeUc: DeleteBookUseCase,
    private readonly resolveFinishedUc: ResolveBookFinishedUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Get()
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Lista los libros propios (filtros: status, categoryId).' })
  async list(
    @Query() query: ListBooksQueryDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.listUc.execute(actor, query);
  }

  @Get(':id')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Detalle de un libro propio.' })
  async get(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.getUc.execute(actor, id);
  }

  @Post()
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Crea un libro propio.' })
  async createOne(
    @Body() dto: CreateBookDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.createUc.execute(actor, dto);
  }

  @Patch(':id')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Edita un libro propio / cambia de estado.' })
  async updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    const book = await this.updateUc.execute(actor, id, dto);
    if (book.status === 'FINISHED') {
      // Cumplimiento inmediato (Fase 8): resuelve las recompensas PENDING de este libro.
      await this.resolveFinishedUc.execute(book.id);
    }
    return book;
  }

  @Delete(':id')
  @Roles([Role.PARENT, Role.CHILD])
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un libro propio.' })
  async deleteOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    await this.removeUc.execute(actor, id);
  }
}
