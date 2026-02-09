import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType, AuthProvider } from '../users/entities/user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 존재하는 이메일입니다');
    }

    // 여행사 회원인 경우 필수 필드 검증
    if (signupDto.userType === UserType.AGENCY) {
      if (!signupDto.agencyName || !signupDto.businessNumber) {
        throw new ConflictException('여행사명과 사업자번호는 필수입니다');
      }
    }

    const user = this.userRepository.create(signupDto);
    await this.userRepository.save(user);

    const { password, ...result } = user;
    return {
      message: '회원가입이 완료되었습니다',
      user: result,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다');
    }

    const isPasswordValid = await user.validatePassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload);

    const { password, ...result } = user;

    return {
      accessToken,
      user: result,
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다');
    }

    return user;
  }

  async validateOAuthLogin(profile: any) {
    let user = await this.userRepository.findOne({
      where: {
        provider: profile.provider,
        providerId: profile.providerId,
      },
    });

    if (!user) {
      // 이메일로 기존 계정 확인
      user = await this.userRepository.findOne({
        where: { email: profile.email },
      });

      if (user) {
        // 기존 계정이 있으면 소셜 연동
        user.provider = profile.provider;
        user.providerId = profile.providerId;
        await this.userRepository.save(user);
      } else {
        // 신규 회원가입
        user = this.userRepository.create({
          email: profile.email,
          name: profile.name,
          provider: profile.provider,
          providerId: profile.providerId,
          userType: UserType.CUSTOMER,
          isActive: true,
          isVerified: true, // 소셜 로그인은 이메일 인증 생략
        });
        await this.userRepository.save(user);
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload);

    const { password, ...result } = user;

    return {
      accessToken,
      user: result,
    };
  }
}
