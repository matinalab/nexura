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
         //读取bucket桶名
         const bucket = this.configService.get<string>('MINIO_BUCKET')!;
         //判断桶是否存在
         const exists = await this.minioClient.bucketExists(bucket);
         //如果桶不存在，则创建桶
         if (!exists) {
            await this.minioClient.makeBucket(bucket);
            await this.minioClient.setBucketPolicy(bucket, JSON.stringify({
                "Version": "2012-10-17", //策略语言版本版本 类似于http版本 例如http1.1 http2.0 这个值固定即可
                "Statement": [
                    {
                        "Sid": "PublicReadObjects", //给这个规则起一个名字
                        "Effect": "Allow", //允许打开这个规则 Allow 允许 Deny 拒绝
                        "Principal": "*",//所有人
                        "Action": ["s3:GetObject"], //允许浏览器获取对象
                        "Resource": ["arn:aws:s3:::avatar/*"] //允许读取 avatar桶内的所有资源
                    }
                ]
            }))
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
