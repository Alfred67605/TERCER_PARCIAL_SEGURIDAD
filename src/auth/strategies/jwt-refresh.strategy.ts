import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Refresh-token strategy.
 * Reads the refresh token from the httpOnly cookie named 'refresh_token'.
 * Also passes the raw token string so the service can verify against the stored hash.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly config: ConfigService) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.refresh_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      // Pass req to validate() so we can read the raw cookie value
      passReqToCallback: true,
    };
    super(options);
  }

  /**
   * Called after JWT signature verification passes.
   * We return the payload + raw token so AuthService can do hash comparison.
   */
  validate(req: Request, payload: { sub: string; email: string }) {
    const rawRefreshToken: string = req.cookies?.refresh_token;
    return { sub: payload.sub, email: payload.email, rawRefreshToken };
  }
}
