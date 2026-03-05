import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTravelerDto } from './create-traveler.dto';

export class CreateReservationDto {
  @IsString()
  productId: string;

  @IsDateString()
  departureDate: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsNumber()
  @Min(1)
  adultCount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  childCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  infantCount?: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsString()
  contactName: string;

  @IsString()
  contactPhone: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTravelerDto)
  travelers?: CreateTravelerDto[];
}
