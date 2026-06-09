import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenPayload, Token, RefreshTokenPayload } from '@nexura/common/user';
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(payload: TokenPayload): Token {
    //sign创建token
    //创建两个 accessToken 验证的token 过期时间是很快的
    //refreshToken 刷新token 过期时间是7天
    //一会儿需要提供刷新token的接口 refreshToken->accessToken
    //payload载荷 可以让开发者自定义信息 {userId,name,email}
    return {
      accessToken: this.jwtService.sign<RefreshTokenPayload>({
        ...payload,
        tokenType: 'access',
      }), //访问令牌
      refreshToken: this.jwtService.sign<RefreshTokenPayload>(
        { ...payload, tokenType: 'refresh' },
        { expiresIn: '7d' },
      ), //刷新令牌通常时间会长一点
    };
  }
}
