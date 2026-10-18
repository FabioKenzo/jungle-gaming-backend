import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WalletEntity } from './infrastructure/persistence/wallet.entity';
import { WalletRepository } from './infrastructure/persistence/wallet.repository';
import { WalletTransactionEntity } from './infrastructure/persistence/transaction/wallet-transaction.entity';
import { WalletTransactionRepository } from './infrastructure/persistence/transaction/wallet-transaction.repository';

@Module({
    imports: [MikroOrmModule.forFeature([WalletEntity, WalletTransactionEntity])],
    controllers: [WalletController],
    providers: [WalletService, WalletRepository, WalletTransactionRepository],
    exports: [WalletRepository]

})
export class WalletModule {}
