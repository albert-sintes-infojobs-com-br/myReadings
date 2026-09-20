import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import {
  GetMeUseCase,
  LoginUseCase,
  RegisterParentUseCase,
} from '../../domain/users/use-cases';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DomainExceptionFilter } from '../shared/domain-exception.filter';

/**
 * Transporte HTTP de Auth (Fase 3, refactor 3 capas en Fase 5).
 *
 * La firma del JWT es un detalle de transporte (NestJS `JwtService`): el
 * dominio (`LoginUseCase`) solo valida credenciales y devuelve el
 * `SafeUser`; el controller compone `{ accessToken, user }`.
 */
@ApiTags('auth')
@Controller('auth')
@UseFilters(DomainExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUc: RegisterParentUseCase,
    private readonly loginUc: LoginUseCase,
    private readonly meUc: GetMeUseCase,
    private readonly jwt: JwtService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registro de un padre (PARENT). Un hijo se crea desde /api/users/children.',
  })
  register(@Body() dto: RegisterDto) {
    return this.registerUc.execute(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login (padre o hijo). Devuelve JWT + datos del usuario.' })
  async login(@Body() dto: LoginDto) {
    const user = await this.loginUc.execute(dto);
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([Role.PARENT, Role.CHILD])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sesión actual (usuario autenticado).' })
  me(@Req() req: { user: { id: number } }) {
    return this.meUc.execute(req.user.id);
  }
}
