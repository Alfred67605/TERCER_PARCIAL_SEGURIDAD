import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ---------- Security middleware ----------
  // Adds various HTTP security headers (Content-Security-Policy, X-Frame-Options, etc.)
  app.use(helmet());

  // Parse Cookie header and populate req.cookies
  app.use(cookieParser());

  // ---------- Global validation ----------
  // whitelist: strips properties not in the DTO
  // forbidNonWhitelisted: throws 400 if unknown properties are present
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 SecureNotes API running on http://localhost:${port}`);
}

bootstrap();
