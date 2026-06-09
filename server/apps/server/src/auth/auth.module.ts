import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SharedModule } from '@libs/shared';

@Module({
  providers: [AuthService],
  exports: [AuthService],
  imports: [SharedModule],
})
export class AuthModule {}
