import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import session from 'express-session';
import passport from 'passport';
import { Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FileStoreFactory = require('session-file-store');
import * as path from 'path';
import * as fs from 'fs';

export function configureApp(app: INestApplication): void {
  // CORS must be registered before session/passport middleware.
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => o === origin || o === '*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  const SessionFileStore = FileStoreFactory(session);
  const sessionsDir =
    process.env.SESSION_STORE_DIR ||
    (process.env.VERCEL ? '/tmp/.sessions' : path.join(process.cwd(), '.sessions'));
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'mango-travel-session-secret',
      proxy: isProduction,
      resave: false,
      saveUninitialized: false,
      store: new SessionFileStore({
        path: sessionsDir,
        ttl: 7 * 24 * 60 * 60,
        retries: 1,
        logFn: () => {},
      }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        // Frontend and backend run on different domains in production (Vercel),
        // so cookies must use SameSite=None + Secure to be sent cross-site.
        sameSite: isProduction ? 'none' : 'lax',
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  httpAdapter.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
