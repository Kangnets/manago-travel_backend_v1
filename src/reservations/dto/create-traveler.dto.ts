import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsEmail,
} from 'class-validator';
import { Gender, TravelerType } from '../entities/traveler.entity';

export class CreateTravelerDto {
  @IsOptional()
  @IsEnum(TravelerType)
  travelerType?: TravelerType;

  @IsString()
  passportLastName: string;

  @IsString()
  passportFirstName: string;

  @IsString()
  passportNumber: string;

  @IsDateString()
  passportExpiry: string;

  @IsDateString()
  birthDate: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  specialRequest?: string;
}
