import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { UserType, AuthProvider } from '../../users/entities/user.entity';

export class SignupDto {
  @IsEmail()
  email: string;

  @ValidateIf(o => o.provider === AuthProvider.LOCAL || !o.provider)
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/, {
    message: '올바른 전화번호 형식이 아닙니다',
  })
  phone?: string;

  @IsEnum(UserType)
  userType: UserType;

  // 여행사 회원 전용 필드
  @IsOptional()
  @IsString()
  agencyName?: string;

  @IsOptional()
  @IsString()
  businessNumber?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
