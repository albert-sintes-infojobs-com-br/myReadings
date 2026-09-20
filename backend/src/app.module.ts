import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './transport/auth/auth.module';
import { UsersModule } from './transport/users/users.module';
import { CategoriesModule } from './transport/categories/categories.module';
import { BooksModule } from './transport/books/books.module';
import { GoalsModule } from './transport/goals/goals.module';
import { RewardsModule } from './transport/rewards/rewards.module';
import { LedgerModule } from './transport/ledger/ledger.module';
import { NotificationsModule } from './transport/notifications/notifications.module';
import { RewardRequestsModule } from './transport/reward-requests/reward-requests.module';
import { StatsModule } from './transport/stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    BooksModule,
    GoalsModule,
    RewardsModule,
    LedgerModule,
    NotificationsModule,
    RewardRequestsModule,
    StatsModule,
  ],
})
export class AppModule {}
