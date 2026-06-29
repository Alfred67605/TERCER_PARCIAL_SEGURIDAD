import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register — Public */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(dto, res);
  }

  /** POST /auth/login — Public */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, req, res);
  }

  /**
   * POST /auth/refresh — Protected with Refresh token (httpOnly cookie).
   * Issues a new access token and rotates the refresh token.
   */
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Req() req: Request & { user: { sub: string; email: string; rawRefreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(req.user.sub, req.user.rawRefreshToken, req, res);
  }

  /** GET /auth/me — Protected with Access token */
  @UseGuards(JwtAccessGuard)
  @Get('me')
  me(@Req() req: Request & { user: { sub: string; email: string } }) {
    return this.authService.me(req.user.sub);
  }

  /** POST /auth/logout — Protected with Refresh token */
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req() req: Request & { user: { sub: string; rawRefreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(req.user.sub, req.user.rawRefreshToken, res);
  }

  /** GET /auth/sessions — Protected with Access token */
  @UseGuards(JwtAccessGuard)
  @Get('sessions')
  getSessions(
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.authService.getSessions(req.user.sub);
  }
}
