import { Injectable,OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio'
import { ConfigService } from '@nestjs/config'; //操作环境变量
@Injectable()
export class MinioService implements OnModuleInit {
    private readonly minioClient: Minio.Client; //minio客户端
    constructor(private readonly configService: ConfigService) {
        this.minioClient = new Minio.Client({
            endPoint: this.configService.get<string>('MINIO_ENDPOINT')!, //minio地址
            port: Number(this.configService.get('MINIO_PORT')), //minio端口
            useSSL: !!Number(this.configService.get<string>('MINIO_USE_SSL')), //是否使用SSL
            accessKey: this.configService.get<string>('MINIO_ACCESS_KEY')!, //minio访问密钥
            secretKey: this.configService.get<string>('MINIO_SECRET_KEY')!, //minio密钥
        });
    }
    //Nestjs的生命周期 也就是模块初始化时执行
    async onModuleInit () {
         const bucket = this.configService.get<string>('MINIO_BUCKET')!;
         try {
             const exists = await this.minioClient.bucketExists(bucket);
             if (!exists) {
                await this.minioClient.makeBucket(bucket);
                await this.minioClient.setBucketPolicy(bucket, JSON.stringify({
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadObjects",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": [`arn:aws:s3:::${bucket}/*`]
                        }
                    ]
                }))
             }
         } catch (err: any) {
             // BucketAlreadyOwnedByYou means bucket exists, safe to ignore
             if (err?.code !== 'BucketAlreadyOwnedByYou') {
                 throw err;
             }
         }
    }
    //获取minio客户端
    getClient() {
        return this.minioClient;
    }
    //获取minio桶名
    getBucket() {
        return this.configService.get<string>('MINIO_BUCKET')!;
    }
}
