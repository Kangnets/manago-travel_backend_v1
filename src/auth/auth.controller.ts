import { Controller, Post, Patch, Body, Get, UseGuards, Request, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { OAuthConfiguredGuard } from './guards/oauth-configured.guard';
import { AuthenticatedGuard } from './guards/authenticated.guard';

function resolveFrontendUrl(req: any): string {
  const envUrl = process.env.FRONTEND_URL?.trim();
  if (envUrl) return envUrl;

  const origin = req?.headers?.origin as string | undefined;
  if (origin) return origin;

  const referer = req?.headers?.referer as string | undefined;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore malformed referer
    }
  }

  return 'http://localhost:3001';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto, @Request() req) {
    const result = await this.authService.signup(signupDto);
    // 회원가입 후 자동 로그인 — 세션이 저장된 뒤에 응답 반환
    await new Promise<void>((resolve, reject) => {
      (req as any).login(result.user, (err: Error | null) => {
        if (err) return reject(err);
        (req.session as any).save((err: Error | null) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Request() req) {
    const user = await this.authService.validateUser(loginDto);

    return new Promise((resolve, reject) => {
      (req as any).login(user, (err: Error | null) => {
        if (err) return reject(err);
        (req.session as any).save((err: Error | null) => {
          if (err) return reject(err);
          const { password, ...result } = user;
          resolve({ message: '로그인 성공', user: result });
        });
      });
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req, @Res() res: Response) {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: '로그아웃 실패' });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: '세션 삭제 실패' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: '로그아웃 성공' });
      });
    });
  }

  @Get('me')
  @UseGuards(AuthenticatedGuard)
  async getProfile(@Request() req) {
    return { user: req.user };
  }

  @Get('check')
  async checkAuth(@Request() req) {
    if (req.isAuthenticated()) {
      return { authenticated: true, user: req.user };
    }
    return { authenticated: false, user: null };
  }

  @Patch('profile')
  @UseGuards(AuthenticatedGuard)
  async updateProfile(
    @Request() req,
    @Body() body: { name?: string; phone?: string; address?: string },
  ) {
    const updated = await this.authService.updateProfile(req.user.id, body);
    req.session.passport = { user: { ...req.user, ...updated } };
    return { message: '프로필이 업데이트되었습니다', user: updated };
  }

  @Patch('password')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    await this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
    return { message: '비밀번호가 변경되었습니다' };
  }

  // Google OAuth (설정되지 않으면 로그인 페이지로 리다이렉트)
  @Get('google')
  @UseGuards(OAuthConfiguredGuard('google'), GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Request() req, @Res() res: Response) {
    const frontendUrl = resolveFrontendUrl(req);
    // req.user = 구글 프로필(profile). DB User로 만들고 세션에 저장해야 함.
    const dbUser = await this.authService.validateOAuthLogin(req.user);
    await new Promise<void>((resolve, reject) => {
      (req as any).login(dbUser, (err: Error | null) => {
        if (err) return reject(err);
        (req.session as any).save((err: Error | null) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }

  // Kakao OAuth (설정되지 않으면 로그인 페이지로 리다이렉트)
  @Get('kakao')
  @UseGuards(OAuthConfiguredGuard('kakao'), KakaoAuthGuard)
  async kakaoAuth() {
    // Guard redirects to Kakao
  }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  async kakaoAuthCallback(@Request() req, @Res() res: Response) {
    const frontendUrl = resolveFrontendUrl(req);
    const dbUser = await this.authService.validateOAuthLogin(req.user);
    await new Promise<void>((resolve, reject) => {
      (req as any).login(dbUser, (err: Error | null) => {
        if (err) return reject(err);
        (req.session as any).save((err: Error | null) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }
}
