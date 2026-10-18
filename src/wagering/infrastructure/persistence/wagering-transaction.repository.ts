import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';
import { WageringTransactionEntity, WageringTransactionType, } from './wagering-transaction.entity';

@Injectable()
export class WageringTransactionRepository {
    async create(
        entityManager: EntityManager,
        data: {
            walletId: string;
            playerId: string;
            currency: string;
            type: WageringTransactionType;
            amount: string;
            idempotencyKey: string;
        },
    ): Promise<WageringTransactionEntity> {
        const transaction = entityManager.create(
            WageringTransactionEntity,
            {
                id: randomUUID(),
                walletId: data.walletId,
                playerId: data.playerId,
                currency: data.currency,
                type: data.type,
                status: 'PROCESSED',
                amount: data.amount,
                idempotencyKey: data.idempotencyKey,
                createdAt: new Date(),
                processedAt: new Date(),
            },
        );

        await entityManager.persistAndFlush(transaction);

        return transaction;
    }
}
