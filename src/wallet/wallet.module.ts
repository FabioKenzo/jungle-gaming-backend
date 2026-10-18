import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletEntity } from './infrastructure/persistence/wallet.entity';
import { WalletRepository } from './infrastructure/persistence/wallet.repository';
import { WalletTransactionEntity } from './infrastructure/persistence/transaction/wallet-transaction.entity';
import { WalletTransactionRepository } from './infrastructure/persistence/transaction/wallet-transaction.repository';
import { WageringTransactionEntity } from '../wagering/infrastructure/persistence/wagering-transaction.entity';
import { WageringTransactionRepository } from '../wagering/infrastructure/persistence/wagering-transaction.repository';
import { WageringService } from '../wagering/wagering.service';
import { WageringController } from '../wagering/wagering.controller';


@Module({
    imports: [
        MikroOrmModule.forFeature([
            WalletEntity,
            WalletTransactionEntity,
            WageringTransactionEntity,
        ]),
    ],
    controllers: [WalletController,WageringController],
    providers: [
        WalletService,
        WalletRepository,
        WalletTransactionRepository,
        WageringTransactionRepository,
        WageringService,
    ],
    exports: [WalletRepository],
})
export class WalletModule { }

