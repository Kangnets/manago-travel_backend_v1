import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email: string;

  @IsString()
  @MinLength(1, { message: '비밀번호를 입력해주세요' })
  password: string;
}
