import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects routes that require a valid refresh token (httpOnly cookie). */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
