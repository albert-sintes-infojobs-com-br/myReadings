import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PenalizeOverdueRewardsUseCase } from '../../domain/ledger/use-cases';

/**
 * Tarea programada diaria (Fase 8): penaliza recompensas `PENDING` cuyo
 * `deadline` ya venció (y, como red de seguridad, resuelve `FULFILLED`
 * cualquier pendiente cuyo libro ya esté `FINISHED` a tiempo pero no se
 * hubiera resuelto de forma inmediata).
 */
@Injectable()
export class RewardPenalizationScheduler {
  private readonly logger = new Logger(RewardPenalizationScheduler.name);

  constructor(private readonly penalizeUc: PenalizeOverdueRewardsUseCase) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron(): Promise<void> {
    const { fulfilled, penalized } = await this.penalizeUc.execute();
    this.logger.log(`Resolución diaria: ${fulfilled} cumplida(s), ${penalized} penalizada(s)`);
  }
}
