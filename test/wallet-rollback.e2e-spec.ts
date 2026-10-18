import { randomUUID } from 'node:crypto';
import { describe, it, expect } from '@jest/globals';
import { MikroORM } from '@mikro-orm/postgresql';

import mikroOrmConfig from '../mikro-orm.config';
import { WalletEntity } from '../src/wallet/infrastructure/persistence/wallet.entity';

describe('Wallet - Rollback (Integração)', () => {
    it('deve desfazer a criação da carteira quando ocorre uma falha', async () => {
        const orm = await MikroORM.init(mikroOrmConfig);
        const playerId = randomUUID();
        const walletId = randomUUID();

        try {
            // Executa uma transação real no PostgreSQL.
            await expect(
                orm.em.fork().transactional(async (em) => {
                    const wallet = em.create(WalletEntity, {
                        id: walletId,
                        playerId,
                        currency: 'BRL',
                        balance: '1000.00',
                        version: 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });

                    await em.persistAndFlush(wallet);

                    // Confirma que a carteira existe dentro da transação.
                    const walletInsideTransaction = await em.findOne(
                        WalletEntity,
                        { id: walletId },
                    );

                    expect(walletInsideTransaction).not.toBeNull();

                    // Simula uma falha antes de concluir a operação.
                    throw new Error('Falha simulada no OPENING');
                }),
            ).rejects.toThrow('Falha simulada no OPENING');

            // Consulta o banco após o rollback.
            const walletAfterRollback = await orm.em.fork().findOne(
                WalletEntity,
                { id: walletId },
            );

            // A carteira não pode permanecer persistida.
            expect(walletAfterRollback).toBeNull();
        } finally {
            await orm.close(true);
        }
    });
});
