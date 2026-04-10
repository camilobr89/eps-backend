import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AUTH_SESSION_TTL_MS } from './auth.constants';

@Controller('auth')
@ApiTags('Auth')
@Throttle({ default: { ttl: 60_000, limit: 10 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar un nuevo usuario',
    description:
      'Crea una nueva cuenta de usuario con email, contraseña y nombre completo.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'usuario@ejemplo.com',
        fullName: 'Juan Pérez',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica al usuario y devuelve un token de acceso. El refresh token se establece como cookie HTTP-only.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o usuario inactivo',
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);

    // Setear refresh token en cookie httpOnly
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: AUTH_SESSION_TTL_MS,
      path: '/api/auth',
    });

    return { accessToken };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refrescar token de acceso',
    description:
      "Genera un nuevo token de acceso usando el refresh token almacenado en la cookie 'refreshToken'.",
  })
  @ApiResponse({
    status: 200,
    description: 'Token de acceso renovado exitosamente',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido, expirado o no proporcionado',
  })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      return { statusCode: 401, message: 'No refresh token provided' };
    }

    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Invalida el refresh token y limpia la cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (refreshToken) {
      await this.authService.logoutByRefreshToken(refreshToken);
    }

    // Limpiar cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
    });

    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Obtener perfil del usuario',
    description: 'Retorna la información del perfil del usuario autenticado.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario obtenido exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - token de acceso inválido o faltante',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: { id: string }) {
    return this.authService.getUserProfile(user.id);
  }

  @Put('preferences')
  @ApiOperation({
    summary: 'Actualizar preferencias de notificación',
    description:
      'Actualiza las preferencias de notificación (email, WhatsApp) del usuario.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateUserPreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actualizadas exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - token de acceso inválido o faltante',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @UseGuards(JwtAuthGuard)
  async updatePreferences(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.authService.updatePreferences(user.id, dto);
  }
}
