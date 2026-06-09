import { NestFactory } from '@nestjs/core';
import { AiModule } from './ai.module';
import { Config } from '@nexura/config';
import { InterceptorInterceptor } from '@libs/shared/interceptor/interceptor';
import { InterceptorExceptionFilter } from '@libs/shared/interceptor/exceptionFilter';
import { VersioningType } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create(AiModule);
  app.useGlobalInterceptors(new InterceptorInterceptor());
  app.useGlobalFilters(new InterceptorExceptionFilter());
  app.setGlobalPrefix('ai'); //设置全局前缀
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' }); //设置版本号v1
  await app.listen(Config.ports.ai);
}
bootstrap();
