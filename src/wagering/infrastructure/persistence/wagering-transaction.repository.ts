import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';
import { WageringTransactionEntity, WageringTransactionType, WageringTransactionStatus, } from './wagering-transaction.entity';

export interface CreateWageringTransaction {
    walletId: string;
    playerId: string;
    currency: string;
    type: WageringTransactionType;
    amount: string;
    idempotencyKey: string;

    status?: WageringTransactionStatus;
    providerId?: string;
    externalTransactionId?: string;
    payloadHash?: string;
    roundId?: string;
    gameId?: string;
    referenceExternalTransactionId?: string;
    referenceTransactionId?: string;
    failureCode?: string;
}

@Injectable()
export class WageringTransactionRepository {
    async create(
        entityManager: EntityManager,
        data: CreateWageringTransaction,
    ): Promise<WageringTransactionEntity> {
        const now = new Date();
        const status = data.status ?? 'PROCESSED';

        const transaction = entityManager.create(
            WageringTransactionEntity,
            {
                id: randomUUID(),
                walletId: data.walletId,
                playerId: data.playerId,
                currency: data.currency,
                type: data.type,
                status,
                amount: data.amount,
                idempotencyKey: data.idempotencyKey,
                createdAt: now,

                processedAt:
                    status === 'PROCESSED' ? now : null,

                providerId: data.providerId ?? null,
                externalTransactionId:
                    data.externalTransactionId ?? null,
                payloadHash: data.payloadHash ?? null,
                roundId: data.roundId ?? null,
                gameId: data.gameId ?? null,
                referenceExternalTransactionId:
                    data.referenceExternalTransactionId ?? null,
                referenceTransactionId:
                    data.referenceTransactionId ?? null,
                failureCode: data.failureCode ?? null,
            },
        );

        await entityManager.persistAndFlush(transaction);

        return transaction;
    }

    async findByIdempotencyKey(
        entityManager: EntityManager,
        idempotencyKey: string,
    ): Promise<WageringTransactionEntity | null> {
        return entityManager.findOne(
            WageringTransactionEntity,
            { idempotencyKey },
        );
    }

    async findByExternalTransactionId(
        entityManager: EntityManager,
        providerId: string,
        externalTransactionId: string,
    ): Promise<WageringTransactionEntity | null> {
        return entityManager.findOne(
            WageringTransactionEntity,
            {
                providerId,
                externalTransactionId,
            },
        );
    }

    async findRefundsByReference(
        entityManager: EntityManager,
        referenceTransactionId: string,
    ): Promise<WageringTransactionEntity[]> {
        return entityManager.find(
            WageringTransactionEntity,
            {
                type: 'REFUND',
                referenceTransactionId,
                status: 'PROCESSED',
            },
        );
    }

    // Verifica se a transação original já sofreu ROLLBACK.
    async findRollbackByReference(
        entityManager: EntityManager,
        referenceTransactionId: string,
    ): Promise<WageringTransactionEntity | null> {
        return entityManager.findOne(
            WageringTransactionEntity,
            {
                type: 'ROLLBACK',
                referenceTransactionId,
                status: 'PROCESSED',
            },
        );
    }

    async findById(
        entityManager: EntityManager,
        id: string,
    ): Promise<WageringTransactionEntity | null> {
        return entityManager.findOne(
            WageringTransactionEntity,
            { id },
        );
    }
}


