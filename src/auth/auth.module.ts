import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from '../entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    // JwtModule registered without default secret —
    // each call to jwtService.sign() passes its own secret & options
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshToken]),
    UsersModule,
  ],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
