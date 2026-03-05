import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(user: any, done: (err: Error, user: any) => void): void {
    done(null, { id: user.id });
  }

  async deserializeUser(
    payload: any,
    done: (err: Error | null, user?: any) => void,
  ): Promise<void> {
    try {
      const user = await this.authService.findUserById(payload.id);
      const { password, ...result } = user;
      done(null, result);
    } catch (e) {
      done(e as Error, undefined);
    }
  }
}
