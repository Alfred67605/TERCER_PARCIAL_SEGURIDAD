import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects routes that require a valid, non-expired access token (Bearer). */
@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {}
