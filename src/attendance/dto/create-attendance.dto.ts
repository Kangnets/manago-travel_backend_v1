import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AttendanceStatus } from '../entities/attendance.entity';

export class CreateAttendanceDto {
  @IsString()
  employeeId: string;

  @IsString()
  employeeName: string;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @IsNumber()
  workHours?: number;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  memo?: string;
}

export class CheckInDto {
  @IsString()
  employeeId: string;

  @IsString()
  employeeName: string;

  @IsOptional()
  @IsString()
  memo?: string;
}

export class CheckOutDto {
  @IsOptional()
  @IsString()
  memo?: string;
}
