import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Request, Response } from 'express';

type ExpressServer = (req: Request, res: Response) => void;

let cachedServer: ExpressServer | null = null;

async function getServer(): Promise<ExpressServer> {
  if (cachedServer) {
    return cachedServer;
  }

  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.init();

  cachedServer = app.getHttpAdapter().getInstance();
  return cachedServer;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const server = await getServer();
  return server(req, res);
}
