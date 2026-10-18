import {Entity, PrimaryKey, Property, Unique, Check} from '@mikro-orm/core';

@Entity({ tableName: 'wallet_transactions' })
@Unique({ properties: ['idempotencyKey'] })
@Check({ expression: 'amount > 0' })
export class WalletTransactionEntity {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @Property({ type: 'uuid' })
    walletId!: string;

    @Property({ type: 'varchar', length: 6 })
    type!: 'CREDIT' | 'DEBIT';

    @Property({ type: 'decimal', precision: 20, scale: 2 })
    amount!: string;

    @Property({ type: 'decimal', precision: 20, scale: 2 })
    balanceAfter!: string;

    @Property({ type: 'int' })
    versionAfter!: number;

    @Property({ type: 'datetime', nullable: true })
    walletUpdatedAt?: Date | null;

    @Property({ type: 'varchar', length: 100 })
    idempotencyKey!: string;

    @Property({ type: 'datetime' })
    createdAt!: Date;

    @Property({ type: 'uuid', nullable: true })
    transactionId?: string | null;
}
