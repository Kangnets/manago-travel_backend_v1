import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor() {
    super({
      clientID: process.env.KAKAO_CLIENT_ID,
      callbackURL: process.env.KAKAO_CALLBACK_URL || 'http://localhost:3000/api/auth/kakao/callback',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, username, _json } = profile;
    
    const user = {
      providerId: String(id),
      email: _json.kakao_account?.email,
      name: _json.kakao_account?.profile?.nickname || username,
      photo: _json.kakao_account?.profile?.profile_image_url,
      provider: 'kakao',
    };

    done(null, user);
  }
}
