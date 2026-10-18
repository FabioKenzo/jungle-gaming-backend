import 'dotenv/config';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

import { WalletEntity } from './src/wallet/infrastructure/persistence/wallet.entity';
import { WalletTransactionEntity } from './src/wallet/infrastructure/persistence/transaction/wallet-transaction.entity';
import { WageringTransactionEntity } from './src/wagering/infrastructure/persistence/wagering-transaction.entity';

export default defineConfig({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5433),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,

    entities: [
        WalletEntity,
        WalletTransactionEntity,
        WageringTransactionEntity,
    ],

    extensions: [Migrator],

    migrations: {
        path: './dist/migrations',
        pathTs: './src/migrations',
        tableName: 'mikro_orm_migrations',
    },
});

