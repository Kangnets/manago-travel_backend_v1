import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PocketBaseService } from '../pocketbase/pocketbase.service';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { CreateAttendanceDto, CheckInDto, CheckOutDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

const ATTENDANCE_COLLECTION = 'attendance';
const USERS_COLLECTION = 'app_users';

/** 한국 시간(KST=UTC+9) 기준으로 오늘 날짜 반환 */
function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

/** 한국 시간(KST) 기준으로 현재 HH:MM 반환 */
function getTimeKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const h = kst.getUTCHours().toString().padStart(2, '0');
  const m = kst.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function mapRecordToAttendance(record: any): Attendance {
  return {
    id: record.id,
    agencyId: record.agencyId,
    employeeId: record.employeeId,
    employeeName: record.employeeName,
    date: record.date,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    workHours: record.workHours ? Number(record.workHours) : undefined,
    status: record.status || AttendanceStatus.PRESENT,
    memo: record.memo,
    created: record.created,
    updated: record.updated,
  };
}

function calculateWorkHours(checkIn: string, checkOut: string): number {
  const [inHour, inMin] = checkIn.split(':').map(Number);
  const [outHour, outMin] = checkOut.split(':').map(Number);
  const hours = outHour - inHour + (outMin - inMin) / 60;
  return Math.round(hours * 100) / 100;
}

function determineStatus(checkIn: string, checkOut?: string): AttendanceStatus {
  const [inHour, inMin] = checkIn.split(':').map(Number);
  const checkInMinutes = inHour * 60 + inMin;

  // 기준: 09:00 출근, 18:00 퇴근
  const standardCheckIn = 9 * 60; // 09:00
  const standardCheckOut = 18 * 60; // 18:00

  if (checkInMinutes > standardCheckIn + 10) {
    // 10분 이상 지각
    return AttendanceStatus.LATE;
  }

  if (checkOut) {
    const [outHour, outMin] = checkOut.split(':').map(Number);
    const checkOutMinutes = outHour * 60 + outMin;
    if (checkOutMinutes < standardCheckOut - 10) {
      // 10분 이상 조퇴
      return AttendanceStatus.EARLY_LEAVE;
    }
  }

  return AttendanceStatus.PRESENT;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly pb: PocketBaseService) {}

  async checkIn(agencyId: string, checkInDto: CheckInDto): Promise<Attendance> {
    const today = getTodayKST();
    const timeString = getTimeKST();

    // 오늘 이미 출근했는지 확인
    const existing = await this.pb.collection(ATTENDANCE_COLLECTION).getList(1, 1, {
      filter: `agencyId = "${agencyId}" && employeeId = "${checkInDto.employeeId}" && date = "${today}"`,
      requestKey: `checkin-check-${checkInDto.employeeId}`,
    } as any);

    if (existing.totalItems > 0) {
      throw new BadRequestException('오늘 이미 출근 등록되어 있습니다.');
    }

    const status = determineStatus(timeString);

    const record = await this.pb.collection(ATTENDANCE_COLLECTION).create({
      agencyId,
      employeeId: checkInDto.employeeId,
      employeeName: checkInDto.employeeName,
      date: today,
      checkIn: timeString,
      status,
      memo: checkInDto.memo,
    });

    return mapRecordToAttendance(record);
  }

  async checkOut(agencyId: string, employeeId: string, checkOutDto: CheckOutDto): Promise<Attendance> {
    const today = getTodayKST();
    const timeString = getTimeKST();

    // 오늘 출근 기록 찾기
    const existing = await this.pb.collection(ATTENDANCE_COLLECTION).getList(1, 1, {
      filter: `agencyId = "${agencyId}" && employeeId = "${employeeId}" && date = "${today}"`,
      requestKey: `checkout-check-${employeeId}`,
    } as any);

    if (existing.totalItems === 0) {
      throw new BadRequestException('출근 기록이 없습니다. 먼저 출근을 등록해주세요.');
    }

    const record = existing.items[0] as any;

    if (record.checkOut) {
      throw new BadRequestException('오늘 이미 퇴근 등록되어 있습니다.');
    }

    const workHours = calculateWorkHours(record.checkIn, timeString);
    const status = determineStatus(record.checkIn, timeString);

    const updated = await this.pb.collection(ATTENDANCE_COLLECTION).update(record.id, {
      checkOut: timeString,
      workHours,
      status,
      memo: checkOutDto.memo || record.memo,
    });

    return mapRecordToAttendance(updated);
  }

  async getTodayRecord(agencyId: string, employeeId: string): Promise<Attendance | null> {
    const today = getTodayKST();

    const existing = await this.pb.collection(ATTENDANCE_COLLECTION).getList(1, 1, {
      filter: `agencyId = "${agencyId}" && employeeId = "${employeeId}" && date = "${today}"`,
      requestKey: `today-record-${agencyId}-${employeeId}`,
    } as any);

    if (existing.totalItems === 0) {
      return null;
    }

    return mapRecordToAttendance(existing.items[0]);
  }

  async findAll(
    agencyId: string,
    query: {
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      status?: AttendanceStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: Attendance[]; total: number; page: number; limit: number }> {
    const { employeeId, startDate, endDate, status, page = 1, limit = 50 } = query;
    let filter = `agencyId = "${agencyId}"`;

    if (employeeId) filter += ` && employeeId = "${employeeId}"`;
    if (startDate) filter += ` && date >= "${startDate}"`;
    if (endDate) filter += ` && date <= "${endDate}"`;
    if (status) filter += ` && status = "${status}"`;

    const list = await this.pb.collection(ATTENDANCE_COLLECTION).getList(page, limit, {
      filter,
      sort: '-date,-checkIn',
      requestKey: `findall-${agencyId}-${Math.random().toString(36).slice(2)}`,
    } as any);

    return {
      data: list.items.map((item: any) => mapRecordToAttendance(item)),
      total: list.totalItems,
      page,
      limit,
    };
  }

  async findOne(id: string, agencyId: string): Promise<Attendance> {
    const record = await this.pb.collection(ATTENDANCE_COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`근태 기록을 찾을 수 없습니다. (ID: ${id})`);
    if ((record as any).agencyId !== agencyId)
      throw new NotFoundException('이 근태 기록에 대한 접근 권한이 없습니다.');
    return mapRecordToAttendance(record);
  }

  async update(id: string, agencyId: string, updateAttendanceDto: UpdateAttendanceDto): Promise<Attendance> {
    await this.findOne(id, agencyId);

    const updateData: any = { ...updateAttendanceDto };

    // checkIn, checkOut이 변경되면 workHours와 status 재계산
    if (updateAttendanceDto.checkIn || updateAttendanceDto.checkOut) {
      const current = await this.pb.collection(ATTENDANCE_COLLECTION).getOne(id) as any;
      const checkIn = updateAttendanceDto.checkIn || current.checkIn;
      const checkOut = updateAttendanceDto.checkOut || current.checkOut;

      if (checkIn && checkOut) {
        updateData.workHours = calculateWorkHours(checkIn, checkOut);
        updateData.status = determineStatus(checkIn, checkOut);
      }
    }

    const updated = await this.pb.collection(ATTENDANCE_COLLECTION).update(id, updateData);
    return mapRecordToAttendance(updated);
  }

  async remove(id: string, agencyId: string): Promise<void> {
    await this.findOne(id, agencyId);
    await this.pb.collection(ATTENDANCE_COLLECTION).delete(id);
  }

  /** 사장 전용: 소속 전체 직원의 오늘 근태 현황 */
  async getTodayAllForAgency(agencyId: string): Promise<{
    employeeId: string;
    employeeName: string;
    email: string;
    role: 'owner' | 'employee';
    record: Attendance | null;
  }[]> {
    const today = getTodayKST();
    const rk = () => Math.random().toString(36).slice(2);
    const employeeList = await this.pb.collection(USERS_COLLECTION).getFullList({
      filter: `userType = "agency" && (id = "${agencyId}" || agencyOwnerId = "${agencyId}")`,
      sort: 'agencyRole,-created',
      requestKey: `today-all-users-${agencyId}-${rk()}`,
    } as any);

    return Promise.all(
      (employeeList as any[]).map(async (emp) => {
        const list = await this.pb.collection(ATTENDANCE_COLLECTION).getList(1, 1, {
          filter: `agencyId = "${agencyId}" && employeeId = "${emp.id}" && date = "${today}"`,
          requestKey: `today-all-rec-${emp.id}-${rk()}`,
        } as any);
        return {
          employeeId: emp.id,
          employeeName: emp.name || emp.email || '',
          email: emp.email || '',
          role: (emp.agencyRole === 'employee' ? 'employee' : 'owner') as 'owner' | 'employee',
          record: list.totalItems > 0 ? mapRecordToAttendance(list.items[0]) : null,
        };
      }),
    );
  }

  /** 사장 소속 직원 목록 (사장 본인 + agencyOwnerId=ownerId 인 직원) */
  async getAgencyEmployees(ownerId: string): Promise<{ id: string; name: string; email: string; role: 'owner' | 'employee' }[]> {
    const rk = () => Math.random().toString(36).slice(2);
    const owner = await this.pb.collection(USERS_COLLECTION).getOne(ownerId, {
      requestKey: `employees-owner-${ownerId}-${rk()}`,
    } as any).catch(() => null);
    const list = await this.pb.collection(USERS_COLLECTION).getFullList({
      filter: `userType = "agency" && (id = "${ownerId}" || agencyOwnerId = "${ownerId}")`,
      sort: 'agencyRole,-created',
      requestKey: `employees-list-${ownerId}-${rk()}`,
    } as any);
    return (list as any[]).map((r) => ({
      id: r.id,
      name: r.name || r.email || '',
      email: r.email || '',
      role: r.agencyRole === 'employee' ? 'employee' : 'owner',
    }));
  }

  async getStatistics(
    agencyId: string,
    query: {
      employeeId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{
    totalDays: number;
    presentDays: number;
    lateDays: number;
    earlyLeaveDays: number;
    absentDays: number;
    totalWorkHours: number;
    averageWorkHours: number;
  }> {
    const { employeeId, startDate, endDate } = query;
    let filter = `agencyId = "${agencyId}"`;

    if (employeeId) filter += ` && employeeId = "${employeeId}"`;
    if (startDate) filter += ` && date >= "${startDate}"`;
    if (endDate) filter += ` && date <= "${endDate}"`;

    const list = await this.pb.collection(ATTENDANCE_COLLECTION).getFullList({
      filter,
      requestKey: `stats-${agencyId}-${Math.random().toString(36).slice(2)}`,
    } as any);

    const records = list as any[];
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const lateDays = records.filter(r => r.status === AttendanceStatus.LATE).length;
    const earlyLeaveDays = records.filter(r => r.status === AttendanceStatus.EARLY_LEAVE).length;
    const absentDays = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const totalWorkHours = records.reduce((acc, r) => acc + (r.workHours || 0), 0);
    const averageWorkHours = totalDays > 0 ? Math.round((totalWorkHours / totalDays) * 100) / 100 : 0;

    return {
      totalDays,
      presentDays,
      lateDays,
      earlyLeaveDays,
      absentDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      averageWorkHours,
    };
  }
}
