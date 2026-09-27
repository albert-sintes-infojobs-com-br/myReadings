import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Vercel define esta variable en build y runtime; no hay servidor persistente
// (cada request es una función serverless), por eso no se puede usar app.listen().
const isVercel = !!process.env.VERCEL;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('MyReadings API')
    .setDescription('API de gestión de libros/lecturas con recompensas familiares')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, doc);

  if (isVercel) {
    await app.init();
    return app.getHttpAdapter().getInstance();
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`MyReadings API escuchando en http://localhost:${port}/api (docs en /api-docs)`, 'Bootstrap');
  return undefined;
}

if (isVercel) {
  const serverPromise = bootstrap();
  module.exports = async (req: unknown, res: unknown) => {
    const server = (await serverPromise) as (req: unknown, res: unknown) => void;
    server(req, res);
  }; // Muy importante para Vercel
} else {
  bootstrap();
}

