import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletModule } from './wallet/wallet.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { WalletEntity } from './wallet/infrastructure/persistence/wallet.entity';
import { WalletTransactionEntity } from './wallet/infrastructure/persistence/transaction/wallet-transaction.entity';
import { WageringTransactionEntity } from './wagering/infrastructure/persistence/wagering-transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),


    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        driver: PostgreSqlDriver,
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string>('DB_PORT')),
        user: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        dbName: config.getOrThrow<string>('DB_NAME'),
        entities: [WalletEntity, WalletTransactionEntity, WageringTransactionEntity],
      }),
    }),

    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
