import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  GetCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from '../../domain/categories/use-cases';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ActorResolver } from '../shared/actor-resolver';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/**
 * Transporte HTTP de Categorías (Fase 4).
 *
 * Reglas de acceso (en el controller, NO en el dominio):
 *  - CUALQUIE USUARIO AUTENTICADO puede listar (GET /categories)
 *    — el hijo verá las suyas + las del padre.
 *  - Crear / editar / borrar: SOLO el propietario (el dominio aplica
 *    OwnershipError si el actor no es el owner).
 */
@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class CategoriesController {
  constructor(
    private readonly listUc: ListCategoriesUseCase,
    private readonly getUc: GetCategoryUseCase,
    private readonly createUc: CreateCategoryUseCase,
    private readonly updateUc: UpdateCategoryUseCase,
    private readonly removeUc: DeleteCategoryUseCase,
    private readonly actor: ActorResolver,
  ) {}

  @Get()
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Categorías visibles (propias + del padre si es CHILD).' })
  async list(@Req() req: { user: { id: number; role: string } }) {
    const actor = await this.actor.resolve(req.user);
    return this.listUc.execute(actor);
  }

  @Get(':id')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Categoría por id (propias o del padre).' })
  async get(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.getUc.execute(actor, id);
  }

  @Post()
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Crea una categoría del usuario autenticado.' })
  async createOne(
    @Body() dto: CreateCategoryDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.createUc.execute(actor, dto);
  }

  @Put(':id')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Actualiza una categoría (solo propietario).' })
  async updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    return this.updateUc.execute(actor, id, dto);
  }

  @Delete(':id')
  @Roles([Role.PARENT, Role.CHILD])
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una categoría (solo propietario; 409 si tiene libros).' })
  async deleteOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number; role: string } },
  ) {
    const actor = await this.actor.resolve(req.user);
    await this.removeUc.execute(actor, id);
  }
}
