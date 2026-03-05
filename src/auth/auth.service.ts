import { Injectable, UnauthorizedException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PocketBaseService } from '../pocketbase/pocketbase.service';
import { User, UserType, AuthProvider, validatePassword } from '../users/entities/user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

/** PocketBase 컬렉션 이름 (기본 'users' Auth 컬렉션과 구분) */
const USERS_COLLECTION = 'app_users';

/** PocketBase 필터용 문자열 이스케이프 (백슬래시·따옴표) */
function escapeFilterValue(val: string | undefined): string {
  if (val == null) return '';
  return String(val)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/** DB에 bcrypt 해시로 저장된 비밀번호인지 여부 ($2a$, $2b$, $2y$ 형식) */
function isBcryptHash(str: string | undefined): boolean {
  return typeof str === 'string' && /^\$2[aby]\$\d+\$/.test(str);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly pb: PocketBaseService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    await this.ensurePocketBaseReady('signup');

    const existing = await this.pb.collection(USERS_COLLECTION).getList(1, 1, {
      filter: `email = "${escapeFilterValue(signupDto.email)}"`,
    });

    if (existing.items.length > 0) {
      throw new ConflictException('이미 존재하는 이메일입니다');
    }

    if (signupDto.userType === UserType.AGENCY) {
      if (!signupDto.agencyName || !signupDto.businessNumber) {
        throw new ConflictException('여행사명과 사업자번호는 필수입니다');
      }
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    const record = await this.pb.collection(USERS_COLLECTION).create({
      ...signupDto,
      password: hashedPassword,
      provider: AuthProvider.LOCAL,
      isActive: true,
      isVerified: false,
    });

    const user = this.mapRecordToUser(record);
    const { password, ...result } = user;
    return {
      message: '회원가입이 완료되었습니다',
      user: result,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto);
    const { password, ...result } = user;
    return result;
  }

  async validateUser(loginDto: LoginDto): Promise<User> {
    await this.ensurePocketBaseReady('validateUser');

    const email = (loginDto.email || '').toString().trim();
    const password = (loginDto.password || '').toString();

    if (!email || !password) {
      throw new UnauthorizedException('이메일과 비밀번호를 입력해주세요');
    }

    let list: any;
    try {
      list = await this.pb.collection(USERS_COLLECTION).getList(1, 1, {
        filter: `email = "${escapeFilterValue(email)}"`,
      });
    } catch (err) {
      this.handlePocketBaseError(err, 'validateUser.getList');
    }

    const listRecord = list.items[0];
    if (!listRecord) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    // getList 결과에는 password가 누락될 수 있으므로 getOne으로 전체 레코드 조회
    let record: any;
    try {
      record = await this.pb.collection(USERS_COLLECTION).getOne(listRecord.id);
    } catch (err) {
      this.handlePocketBaseError(err, 'validateUser.getOne');
    }
    const user = this.mapRecordToUser(record);

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다');
    }

    if (!user.password) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    let valid = false;
    if (isBcryptHash(user.password)) {
      valid = await validatePassword(user, password);
    } else {
      // PocketBase Admin에서 평문으로 넣은 비밀번호: 평문 비교 후 로그인 성공 시 bcrypt로 저장
      valid = user.password === password;
      if (valid) {
        const hashedPassword = await bcrypt.hash(password, 10);
        try {
          await this.pb.collection(USERS_COLLECTION).update(listRecord.id, { password: hashedPassword });
        } catch (err) {
          this.handlePocketBaseError(err, 'validateUser.updatePassword');
        }
      }
    }
    if (!valid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    return user;
  }

  async findUserById(userId: string): Promise<User> {
    await this.ensurePocketBaseReady('findUserById');

    try {
      const record = await this.pb.collection(USERS_COLLECTION).getOne(userId, {
        requestKey: `deserialize-user-${userId}-${Math.random().toString(36).slice(2)}`,
      } as any);
      const user = this.mapRecordToUser(record);
      if (!user.isActive) {
        throw new UnauthorizedException('유효하지 않은 사용자입니다');
      }
      return user;
    } catch {
      throw new UnauthorizedException('유효하지 않은 사용자입니다');
    }
  }

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; address?: string },
  ): Promise<Omit<User, 'password'>> {
    await this.ensurePocketBaseReady('updateProfile');

    const record = await this.pb.collection(USERS_COLLECTION).update(userId, data);
    const user = this.mapRecordToUser(record);
    const { password, ...result } = user;
    return result;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.ensurePocketBaseReady('changePassword');

    const record = await this.pb.collection(USERS_COLLECTION).getOne(userId);
    const user = this.mapRecordToUser(record);
    const valid = await validatePassword(user, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.pb.collection(USERS_COLLECTION).update(userId, { password: hashed });
  }

  async validateOAuthLogin(profile: any) {
    await this.ensurePocketBaseReady('validateOAuthLogin');

    const provider = (profile.provider || 'google').toLowerCase();
    const providerId = (profile.providerId ?? '').toString();
    const email = (profile.email ?? '').toString().trim();
    const name =
      (profile.name ?? '').toString().trim() ||
      email.split('@')[0] ||
      'User';

    if (!email) {
      throw new UnauthorizedException('이메일 정보를 가져올 수 없습니다.');
    }

    try {
      let list = await this.pb.collection(USERS_COLLECTION).getList(1, 1, {
        filter: `provider = "${escapeFilterValue(provider)}" && providerId = "${escapeFilterValue(providerId)}"`,
      });

      let userRecord = list.items[0] as any;

      if (!userRecord) {
        list = await this.pb.collection(USERS_COLLECTION).getList(1, 1, {
          filter: `email = "${escapeFilterValue(email)}"`,
        });
        userRecord = list.items[0] as any;

        if (userRecord) {
          await this.pb.collection(USERS_COLLECTION).update(userRecord.id, {
            provider,
            providerId,
          });
          userRecord.provider = provider;
          userRecord.providerId = providerId;
        } else {
          const createBody: Record<string, unknown> = {
            email,
            name: name || 'User',
            provider,
            providerId,
            userType: UserType.CUSTOMER,
            isActive: true,
            isVerified: true,
          };
          userRecord = await this.pb.collection(USERS_COLLECTION).create(createBody);
        }
      }

      return this.mapRecordToUser(userRecord);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const responseBody = err?.response ?? err?.data ?? {};
      const rawMessage =
        (typeof responseBody === 'object' ? responseBody?.message : null) ??
        (typeof responseBody === 'object' && responseBody?.data ? responseBody.data.message : null) ??
        err?.message;
      const isMissingCollection =
        status === 404 &&
        (rawMessage?.toLowerCase().includes('missing collection') ||
          rawMessage?.toLowerCase().includes('collection context'));
      const msg = isMissingCollection
        ? 'PocketBase에 app_users 컬렉션이 없습니다. http://localhost:8090/_/ 에서 컬렉션을 생성해주세요. (docs/POCKETBASE_SCHEMA.md 참고)'
        : rawMessage ?? 'OAuth 로그인 처리 중 오류가 발생했습니다.';
      console.error(
        '[validateOAuthLogin] PocketBase error:',
        { status, url: err?.url, message: rawMessage, response: JSON.stringify(responseBody) },
      );
      throw new UnauthorizedException(msg);
    }
  }

  private mapRecordToUser(record: any): User {
    return {
      id: record.id,
      email: record.email,
      password: record.password,
      name: record.name,
      phone: record.phone,
      userType: record.userType || UserType.CUSTOMER,
      provider: record.provider || AuthProvider.LOCAL,
      providerId: record.providerId,
      agencyName: record.agencyName,
      agencyEmail: record.agencyEmail,
      businessNumber: record.businessNumber,
      licenseNumber: record.licenseNumber,
      address: record.address,
      agencyRole: record.agencyRole ?? (record.userType === 'agency' ? 'owner' : undefined),
      agencyOwnerId: record.agencyOwnerId,
      isActive: record.isActive ?? true,
      isVerified: record.isVerified ?? false,
      created: record.created,
      updated: record.updated,
    };
  }

  private handlePocketBaseError(err: any, context: string): never {
    const status = err?.status ?? err?.response?.status;
    const message = err?.message ?? err?.response?.message ?? 'Unknown error';
    const responseBody = err?.response ?? err?.data;

    console.error('[AuthService] PocketBase error', {
      context,
      status,
      message,
      response: responseBody,
    });

    throw new ServiceUnavailableException(
      '로그인 서비스 설정이 필요합니다. 서버의 POCKETBASE_URL/컬렉션(app_users) 구성을 확인해주세요.',
    );
  }

  private async ensurePocketBaseReady(context: string): Promise<void> {
    try {
      await this.pb.ensureSuperuserAuth();
    } catch (err) {
      this.handlePocketBaseError(err, `${context}.ensureSuperuserAuth`);
    }
  }
}
