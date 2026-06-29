import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import type { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // ─────────────────────────── Register ────────────────────────────

  async register(dto: RegisterDto, res: Response) {
    // Check if email already exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash password with argon2 — never store plain text
    const hashedPassword = await argon2.hash(dto.password);
    const user = await this.usersService.create(dto.email, hashedPassword);

    // Issue tokens and persist session
    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email);
    await this.persistRefreshSession(user.id, refreshToken, null);
    this.setRefreshCookie(res, refreshToken);

    return {
      message: 'Usuario registrado exitosamente',
      accessToken,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    };
  }

  // ─────────────────────────── Login ───────────────────────────────

  async login(dto: LoginDto, req: Request, res: Response) {
    // findByEmail explicitly selects password (select:false column)
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verify password with argon2
    const passwordValid = await argon2.verify(user.password, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email);
    const userAgent = (req.headers['user-agent'] as string) ?? null;
    await this.persistRefreshSession(user.id, refreshToken, userAgent);
    this.setRefreshCookie(res, refreshToken);

    return {
      message: 'Inicio de sesión exitoso',
      accessToken,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    };
  }

  // ─────────────────────────── Refresh ─────────────────────────────

  async refresh(
    userId: string,
    rawRefreshToken: string,
    req: Request,
    res: Response,
  ) {
    // Find ALL sessions for the user
    const sessions = await this.refreshTokenRepo.find({ where: { userId } });

    // Try to locate the session that matches this token
    let matchedSession: RefreshToken | null = null;
    for (const session of sessions) {
      const matches = await argon2.verify(session.hashedToken, rawRefreshToken);
      if (matches) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // ── Reuse-detection: session was already revoked ──────────────
    if (matchedSession.revoked) {
      // Potential token theft — revoke ALL sessions for this user
      await this.refreshTokenRepo.update({ userId }, { revoked: true });
      throw new ForbiddenException(
        'Refresh token reutilizado. Todas las sesiones han sido revocadas por seguridad.',
      );
    }

    // ── Check expiry ───────────────────────────────────────────────
    if (new Date() > matchedSession.expiresAt) {
      matchedSession.revoked = true;
      await this.refreshTokenRepo.save(matchedSession);
      throw new UnauthorizedException('Refresh token expirado');
    }

    // ── Rotation: revoke old session, issue new pair ───────────────
    matchedSession.revoked = true;
    await this.refreshTokenRepo.save(matchedSession);

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.issueTokens(
      user.id,
      user.email,
    );
    const userAgent = (req.headers['user-agent'] as string) ?? null;
    await this.persistRefreshSession(user.id, newRefreshToken, userAgent);
    this.setRefreshCookie(res, newRefreshToken);

    return {
      message: 'Token renovado',
      accessToken,
    };
  }

  // ─────────────────────────── Me ──────────────────────────────────

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    // password is excluded by default (select:false) — safe to return user
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  // ─────────────────────────── Logout ──────────────────────────────

  async logout(userId: string, rawRefreshToken: string, res: Response) {
    const sessions = await this.refreshTokenRepo.find({ where: { userId } });

    for (const session of sessions) {
      const matches = await argon2.verify(session.hashedToken, rawRefreshToken);
      if (matches) {
        session.revoked = true;
        await this.refreshTokenRepo.save(session);
        break;
      }
    }

    // Clear the cookie on the client side
    res.clearCookie('refresh_token', { path: '/auth' });
    return { message: 'Sesión cerrada correctamente' };
  }

  // ─────────────────────────── Sessions ────────────────────────────

  async getSessions(userId: string) {
    const sessions = await this.refreshTokenRepo.find({
      where: { userId, revoked: false },
      order: { createdAt: 'DESC' },
    });

    // Filter to only non-expired sessions and omit sensitive hash
    const now = new Date();
    return sessions
      .filter((s) => s.expiresAt > now)
      .map((s) => ({
        sessionId: s.id,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }));
  }

  // ─────────────────────────── Helpers ─────────────────────────────

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpires = this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES');
    const refreshExpires = this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES');

    // Use signAsync to avoid overload ambiguity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpires as any,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires as any,
    });

    return { accessToken, refreshToken };
  }

  private async persistRefreshSession(
    userId: string,
    rawRefreshToken: string,
    userAgent: string | null,
  ) {
    const hashedToken = await argon2.hash(rawRefreshToken);

    // Calculate expiry from the env config (e.g. '7d' → Date)
    const expiresInStr = this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES');
    const expiresAt = this.parseExpiryToDate(expiresInStr);

    const session = this.refreshTokenRepo.create({
      userId,
      hashedToken,
      userAgent,
      revoked: false,
      expiresAt,
    });

    await this.refreshTokenRepo.save(session);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,          // true in production (HTTPS only)
      sameSite: 'strict',
      path: '/auth',           // only sent to /auth/* routes
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });
  }

  /** Parse duration strings like '7d', '15m', '3600s' to a future Date */
  private parseExpiryToDate(expiresIn: string): Date {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [, amount, unit] = match;
    return new Date(Date.now() + parseInt(amount) * units[unit]);
  }
}
