import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';
import { WalletTransactionEntity } from './wallet-transaction.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';

export type WalletTransactionType = 'CREDIT' | 'DEBIT';

export interface CreateWalletTransaction {
    walletId: string;
    transactionId?: string;
    type: WalletTransactionType;
    amount: string;
    balanceAfter: string;
    versionAfter: number;
    walletUpdatedAt: Date;
    idempotencyKey: string;
}

@Injectable()
export class WalletTransactionRepository {
    async create(
        entityManager: EntityManager,
        data: CreateWalletTransaction,
    ): Promise<WalletTransactionEntity> {
        const transaction = entityManager.create(
            WalletTransactionEntity,
            {
                id: randomUUID(),
                walletId: data.walletId,
                type: data.type,
                amount: data.amount,
                balanceAfter: data.balanceAfter,
                versionAfter: data.versionAfter,
                idempotencyKey: data.idempotencyKey,
                createdAt: new Date(),
                walletUpdatedAt: data.walletUpdatedAt,
                transactionId: data.transactionId ?? null
            },
        );

        await entityManager.persistAndFlush(transaction);

        return transaction;
    }

    async findByIdempotencyKey(
        entityManager: EntityManager,
        idempotencyKey: string,
    ): Promise<WalletTransactionEntity | null> {
        return entityManager.findOne(
            WalletTransactionEntity,
            { idempotencyKey },
        );
    }

}
