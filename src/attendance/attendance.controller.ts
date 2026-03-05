import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus } from './entities/attendance.entity';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';

/** 사장이면 agencyId=본인 id, 직원이면 agencyId=사장 id */
function resolveAgencyId(req: any): string {
  const user = req.user;
  if (!user || user.userType !== 'agency') throw new ForbiddenException('여행사 계정만 이용할 수 있습니다.');
  if (user.agencyRole === 'employee') {
    if (!user.agencyOwnerId) throw new ForbiddenException('소속 여행사 정보가 없습니다.');
    return user.agencyOwnerId;
  }
  return user.id;
}

/** 출근/퇴근 시 사용할 employeeId: 직원은 본인만, 사장은 본인 또는 body에서 */
function resolveEmployeeIdForCheck(req: any, bodyEmployeeId?: string): string {
  const user = req.user;
  if (user?.agencyRole === 'employee') return user.id;
  return bodyEmployeeId || user?.id || '';
}

@Controller('attendance')
@UseGuards(AuthenticatedGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@Req() req: any, @Body() checkInDto: CheckInDto) {
    const agencyId = resolveAgencyId(req);
    const employeeId = resolveEmployeeIdForCheck(req, checkInDto.employeeId);
    return this.attendanceService.checkIn(agencyId, { ...checkInDto, employeeId, employeeName: checkInDto.employeeName || req.user?.name || '' });
  }

  @Post('check-out')
  checkOut(@Req() req: any, @Body() checkOutDto: CheckOutDto) {
    const agencyId = resolveAgencyId(req);
    const employeeId = resolveEmployeeIdForCheck(req, (checkOutDto as any).employeeId);
    return this.attendanceService.checkOut(agencyId, employeeId, checkOutDto);
  }

  @Get('today')
  getTodayRecord(@Req() req: any, @Query('employeeId') queryEmployeeId?: string) {
    const agencyId = resolveAgencyId(req);
    const user = req.user;
    let employeeId: string;
    if (user?.agencyRole === 'employee') employeeId = user.id;
    else employeeId = queryEmployeeId || user?.id || '';
    return this.attendanceService.getTodayRecord(agencyId, employeeId);
  }

  @Get('statistics')
  getStatistics(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const agencyId = resolveAgencyId(req);
    if (req.user?.agencyRole === 'employee') employeeId = req.user.id;
    return this.attendanceService.getStatistics(agencyId, { employeeId, startDate, endDate });
  }

  /** 사장 전용: 소속 직원 목록 (본인 + 직원들) */
  @Get('employees')
  getEmployees(@Req() req: any) {
    const user = req.user;
    if (!user || user.userType !== 'agency') throw new ForbiddenException('여행사 계정만 이용할 수 있습니다.');
    const ownerId = user.agencyRole === 'employee' ? user.agencyOwnerId : user.id;
    if (!ownerId) return [];
    return this.attendanceService.getAgencyEmployees(ownerId);
  }

  /** 사장 전용: 오늘 전체 직원 근태 현황 */
  @Get('today-all')
  getTodayAll(@Req() req: any) {
    const user = req.user;
    if (!user || user.userType !== 'agency') throw new ForbiddenException('여행사 계정만 이용할 수 있습니다.');
    if (user.agencyRole === 'employee') throw new ForbiddenException('사장 계정만 이용할 수 있습니다.');
    const agencyId = user.id;
    return this.attendanceService.getTodayAllForAgency(agencyId);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const agencyId = resolveAgencyId(req);
    if (req.user?.agencyRole === 'employee') employeeId = req.user.id;
    return this.attendanceService.findAll(agencyId, {
      employeeId,
      startDate,
      endDate,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const agencyId = resolveAgencyId(req);
    return this.attendanceService.findOne(id, agencyId);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    const agencyId = resolveAgencyId(req);
    return this.attendanceService.update(id, agencyId, updateAttendanceDto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const agencyId = resolveAgencyId(req);
    return this.attendanceService.remove(id, agencyId);
  }
}
