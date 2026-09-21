import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.bootstrap';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();
