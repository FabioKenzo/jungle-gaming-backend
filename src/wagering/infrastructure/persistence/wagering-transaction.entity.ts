import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

export type WageringTransactionType =
    | 'OPENING'
    | 'BET'
    | 'WIN'
    | 'LOSS'
    | 'REFUND'
    | 'ROLLBACK';

export type WageringTransactionStatus =
    | 'PENDING'
    | 'PENDING_REFERENCE'
    | 'PROCESSED'
    | 'REJECTED'
    | 'FAILED';

@Entity({ tableName: 'wagering_transactions' })
export class WageringTransactionEntity {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @Property({ type: 'uuid' })
    walletId!: string;

    @Property({ type: 'uuid' })
    playerId!: string;

    @Property({ type: 'varchar', length: 3 })
    currency!: string;

    @Property({ type: 'varchar', length: 10 })
    type!: WageringTransactionType;

    @Property({ type: 'varchar', length: 20 })
    status!: WageringTransactionStatus;

    @Property({ type: 'decimal', precision: 20, scale: 2 })
    amount!: string;

    @Property({ type: 'datetime' })
    createdAt!: Date;

    @Property({ type: 'varchar', length: 100, nullable: true })
    providerId?: string | null;

    @Property({ type: 'varchar', length: 150, nullable: true })
    externalTransactionId?: string | null;

    @Property({ type: 'varchar', length: 200, unique: true })
    idempotencyKey!: string;

    @Property({ type: 'varchar', length: 64, nullable: true })
    payloadHash?: string | null;

    @Property({ type: 'varchar', length: 150, nullable: true })
    roundId?: string | null;

    @Property({ type: 'varchar', length: 150, nullable: true })
    gameId?: string | null;

    @Property({ type: 'varchar', length: 150, nullable: true })
    referenceExternalTransactionId?: string | null;

    @Property({ type: 'uuid', nullable: true })
    referenceTransactionId?: string | null;

    @Property({ type: 'varchar', length: 100, nullable: true })
    failureCode?: string | null;

    @Property({ type: 'datetime', nullable: true })
    processedAt?: Date | null;
}
