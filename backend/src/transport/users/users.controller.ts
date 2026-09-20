import { Controller, Get, Post, Body, UseFilters, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateChildUseCase,
  GetMeUseCase,
  ListChildrenUseCase,
} from '../../domain/users/use-cases';
import { CreateChildDto } from './dto/create-child.dto';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(DomainExceptionFilter)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly meUc: GetMeUseCase,
    private readonly listChildrenUc: ListChildrenUseCase,
    private readonly createChildUc: CreateChildUseCase,
  ) {}

  @Get('me')
  @Roles([Role.PARENT, Role.CHILD])
  @ApiOperation({ summary: 'Sesión actual (usuario autenticado).' })
  me(@Req() req: { user: { id: number } }) {
    return this.meUc.execute(req.user.id);
  }

  @Get('children')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Hijos del padre autenticado (solo padre).' })
  listChildren(@Req() req: { user: { id: number } }) {
    return this.listChildrenUc.execute(req.user.id);
  }

  @Post('children')
  @Roles([Role.PARENT])
  @ApiOperation({ summary: 'Alta de un hijo (solo padre).' })
  createChild(@Req() req: { user: { id: number } }, @Body() dto: CreateChildDto) {
    return this.createChildUc.execute(req.user.id, dto);
  }
}
