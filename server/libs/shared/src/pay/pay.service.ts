import { Injectable,OnModuleInit } from '@nestjs/common';
import { AlipaySdk } from 'alipay-sdk';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class PayService implements OnModuleInit{
    constructor(private readonly configService: ConfigService) {}
    public alipaySdk: AlipaySdk;
    onModuleInit() {
        this.alipaySdk = new AlipaySdk({
            appId: this.configService.get<string>('ALIPAY_APP_ID')!,//appId
            privateKey: this.configService.get<string>('ALIPAY_PRIVATE_KEY')!, //支付宝应用私钥
            alipayPublicKey: this.configService.get<string>('ALIPAY_PUBLIC_KEY')!, //支付宝公钥
            gateway: this.configService.get<string>('ALIPAY_GATEWAY')!, //支付宝网关
        });
    }
    getAlipaySdk() {
        return this.alipaySdk;
    }
}
