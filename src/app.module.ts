import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PocketbaseModule } from './pocketbase/pocketbase.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuthModule } from './auth/auth.module';
import { ReservationsModule } from './reservations/reservations.module';
import { PaymentsModule } from './payments/payments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PassportCheckModule } from './passport-check/passport-check.module';
import { NoticesModule } from './notices/notices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PocketbaseModule,
    AuthModule,
    ProductsModule,
    ReviewsModule,
    ReservationsModule,
    PaymentsModule,
    AttendanceModule,
    PassportCheckModule,
    NoticesModule,
  ],
})
export class AppModule {}
