import {Entity, PrimaryKey, Property, Unique, Check} from '@mikro-orm/core';


@Entity({ tableName: 'wallets' })
@Unique({ properties: ['playerId', 'currency'] })
@Check({ expression: 'balance >= 0' })
export class WalletEntity {
    @PrimaryKey({ type: 'uuid' })
    id!: string;

    @Property({ type: 'uuid' })
    playerId!: string;

    @Property({ type: 'varchar', length: 3 })
    currency!: string;

    @Property({ type: 'decimal', precision: 20, scale: 2 })
    balance!: string;

    @Property({ type: 'integer', default: 0 })
    version!: number;

    @Property({ type: 'datetime' })
    createdAt!: Date;

    @Property({ type: 'datetime' })
    updatedAt!: Date;
}
