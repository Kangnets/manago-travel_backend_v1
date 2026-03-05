import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportCheckController } from './passport-check.controller';
import { PassportCheckService } from './passport-check.service';

@Module({
  imports: [HttpModule],
  controllers: [PassportCheckController],
  providers: [PassportCheckService],
  exports: [PassportCheckService],
})
export class PassportCheckModule {}
