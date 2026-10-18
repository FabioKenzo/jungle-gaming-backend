import { randomUUID } from 'node:crypto';
import { describe, it, expect } from '@jest/globals';
import { MikroORM } from '@mikro-orm/postgresql';
import mikroOrmConfig from '../mikro-orm.config';
import { WalletService } from '../src/wallet/wallet.service';
import { WalletRepository } from '../src/wallet/infrastructure/persistence/wallet.repository';
import { WalletTransactionRepository } from '../src/wallet/infrastructure/persistence/transaction/wallet-transaction.repository';
import { WageringTransactionRepository } from '../src/wagering/infrastructure/persistence/wagering-transaction.repository';

describe('Wallet - Rollback completo do OPENING', () => {
    it('deve reverter wallet e OPENING quando o ledger falhar', async () => {
        const orm = await MikroORM.init(mikroOrmConfig);
        const playerId = randomUUID();
        const em = orm.em.fork();

        try {
            // Cria os repositórios usando o EntityManager.
            const walletRepository = new WalletRepository(
                em.getRepository('WalletEntity') as any,
            );

            const ledgerRepository = new WalletTransactionRepository();
            const wageringRepository = new WageringTransactionRepository();

            const walletService = new WalletService(
                walletRepository,
                ledgerRepository,
                wageringRepository,
            );

            // Provoca uma falha na gravação do ledger.
            const originalCreate = ledgerRepository.create.bind(ledgerRepository);

            ledgerRepository.create = async () => {
                throw new Error('Falha simulada no ledger');
            };

            await expect(
                walletService.openWallet(playerId, {
                    amount: '1000.00',
                    currency: 'BRL',
                }),
            ).rejects.toThrow('Falha simulada no ledger');

            // Confirma que nenhuma carteira foi persistida.
            const wallets = await em.getConnection().execute(
                'SELECT id FROM wallets WHERE player_id = ?',
                [playerId],
            );

            expect(wallets).toHaveLength(0);

            // Confirma que nenhum OPENING permaneceu persistido.
            const wagerings = await em.getConnection().execute(
                'SELECT id FROM wagering_transactions WHERE player_id = ?',
                [playerId],
            );

            expect(wagerings).toHaveLength(0);

            ledgerRepository.create = originalCreate;
        } finally {
            await orm.close(true);
        }
    });
});
