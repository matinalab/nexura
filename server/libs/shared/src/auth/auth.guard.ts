import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import type { RefreshTokenPayload } from '@nexura/common/user';

//守卫 用于保护路由
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest(); //读取req
    const headers = request.headers; //读取请求头
    if(!headers.authorization){
      throw new UnauthorizedException('你是偷子???'); //401
    }
    const token = headers.authorization.split(' ')[1];
    try {
      const decoded = this.jwtService.verify<RefreshTokenPayload>(token);
      if(decoded.tokenType !== 'access'){
        throw new UnauthorizedException('token已过期或无效'); //401
      }
      request.user = decoded; //payload 存储到自定义属性当中
      return true;
    }
    catch (error) {
      throw new UnauthorizedException('token已过期或无效'); //401
    }
  }
}
//因为不是所有的接口都需要增加token 按需的 login接口 register接口 公共接口 按需使用 哪个接口需要鉴权就给谁加
//web -> axios -> 请求 -> guard(通过之后) -> controller -> service -> xxxx -> response