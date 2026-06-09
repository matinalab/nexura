import { Module, Global } from '@nestjs/common';
import { SharedService } from './shared.service';
import { PrismaModule } from './prisma/prisma.module';
import { ResponseModule } from './response/response.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioModule } from './minio/minio.module';
import { PayModule } from './pay/pay.module';
import { EmailModule } from './email/email.module';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  providers: [SharedService],
  exports: [SharedService, PrismaModule, ResponseModule, JwtModule, ConfigModule,MinioModule,PayModule,EmailModule],
  imports: [
    PrismaModule, ResponseModule,
    ConfigModule.forRoot({
      isGlobal: true, //全局配置
      envFilePath: '.env', //环境变量文件
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('SECRET_KEY'), //秘钥
        signOptions: { expiresIn: 10 }, //10秒过期 方便测试
      }),
    }),
    MinioModule,
    PayModule,
    EmailModule,
  ],
})
export class SharedModule { }

