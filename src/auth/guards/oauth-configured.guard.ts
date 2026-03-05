import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { Response } from 'express';

const PLACEHOLDERS = [
  'your-google-client-id',
  'your-google-client-secret',
  'your-kakao-client-id',
];

function isConfigured(value: string | undefined, placeholder: string): boolean {
  if (!value || value.trim() === '') return false;
  if (PLACEHOLDERS.some((p) => value.toLowerCase().includes(p))) return false;
  return true;
}

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

export function OAuthConfiguredGuard(
  provider: 'google' | 'kakao',
): Type<CanActivate> {
  @Injectable()
  class MixinGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const res = context.switchToHttp().getResponse<Response>();
      const frontendUrl = resolveFrontendUrl(req);

      if (provider === 'google') {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (
          !isConfigured(clientId, 'your-google-client-id') ||
          !isConfigured(clientSecret, 'your-google-client-secret')
        ) {
          res.redirect(
            `${frontendUrl}/login?error=google_oauth_not_configured`,
          );
          return false;
        }
      }

      if (provider === 'kakao') {
        const clientId = process.env.KAKAO_CLIENT_ID;
        if (!isConfigured(clientId, 'your-kakao-client-id')) {
          res.redirect(`${frontendUrl}/login?error=kakao_oauth_not_configured`);
          return false;
        }
      }

      return true;
    }
  }
  return mixin(MixinGuard);
}
