import { Controller, Get, Post, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PassportCheckService } from './passport-check.service';

class VerifyPassportDto {
  passportNumber: string;
  surname: string;
  givenNames: string;
  dateOfBirth: string;
}

@Controller('passport-check')
export class PassportCheckController {
  constructor(private readonly passportCheckService: PassportCheckService) {}

  /**
   * GET /api/passport-check/travel-alarm?nationality=KOR
   * 외교부 여행경보 조회 (data.go.kr 자동승인)
   */
  @Get('travel-alarm')
  async getTravelAlarm(@Query('nationality') nationality: string) {
    if (!nationality) {
      throw new HttpException('nationality 파라미터가 필요합니다.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.passportCheckService.getTravelAlarm(nationality);
    } catch (err: unknown) {
      throw new HttpException(
        { message: err instanceof Error ? err.message : '여행경보 조회 실패' },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * GET /api/passport-check/issuance?year=2024
   * 외교부 여권발급 현황 조회
   */
  @Get('issuance')
  async getPassportIssuance(@Query('year') year?: string) {
    return this.passportCheckService.getPassportIssuance(year);
  }

  /**
   * POST /api/passport-check/verify
   * 외교부 여권 진위확인 (별도 승인 필요)
   */
  @Post('verify')
  async verifyPassport(@Body() dto: VerifyPassportDto) {
    if (!dto.passportNumber || !dto.surname) {
      throw new HttpException(
        'passportNumber, surname은 필수 항목입니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.passportCheckService.verifyPassport(dto);
  }
}
