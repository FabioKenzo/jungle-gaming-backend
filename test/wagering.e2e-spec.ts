import { randomUUID } from 'node:crypto';
import { describe, it, expect } from '@jest/globals';

describe('Wagering - Operações Financeiras (E2E)', () => {
    const baseUrl = 'http://localhost:3000';
    const currency = 'BRL';

    async function post(
        path: string,
        body: Record<string, unknown>,
    ): Promise<Response> {
        return fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }

    async function createWallet(
        playerId: string,
        amount = '100.00',
    ): Promise<void> {
        const response = await post('/wallets', {
            playerId,
            initialBalance: {
                amount,
                currency,
            },
        });

        expect(response.status).toBe(201);
    }

    async function getWallet(playerId: string) {
        const response = await fetch(
            `${baseUrl}/wallets/${playerId}/${currency}`,
        );

        expect(response.status).toBe(200);

        return response.json();
    }

    function createWageringBody(
        playerId: string,
        amount: string,
    ) {
        return {
            playerId,
            currency,
            amount,
            idempotencyKey: randomUUID(),
            providerId: 'jungle-e2e',
            externalTransactionId: randomUUID(),
            roundId: randomUUID(),
            gameId: 'game-e2e',
        };
    }

    it('deve debitar o saldo ao processar um BET', async () => {
        const playerId = randomUUID();

        await createWallet(playerId);

        const response = await post(
            '/wagering/bet',
            createWageringBody(playerId, '30.00'),
        );

        expect(response.status).toBe(200);

        const transaction = await response.json();

        expect(transaction.type).toBe('BET');
        expect(transaction.status).toBe('PROCESSED');
        expect(transaction.amount).toBe('30.00');

        const wallet = await getWallet(playerId);

        expect(wallet.balance.amount).toBe('70.00');
        expect(wallet.version).toBe(2);
    });

    it('deve creditar o saldo ao processar um WIN', async () => {
        const playerId = randomUUID();

        await createWallet(playerId);

        const response = await post(
            '/wagering/win',
            createWageringBody(playerId, '50.00'),
        );

        expect(response.status).toBe(200);

        const transaction = await response.json();

        expect(transaction.type).toBe('WIN');
        expect(transaction.status).toBe('PROCESSED');
        expect(transaction.amount).toBe('50.00');

        const wallet = await getWallet(playerId);

        expect(wallet.balance.amount).toBe('150.00');
        expect(wallet.version).toBe(2);
    });

    it('não deve debitar duas vezes ao repetir o mesmo BET', async () => {
        const playerId = randomUUID();

        await createWallet(playerId);

        const body = createWageringBody(playerId, '30.00');

        const firstResponse = await post('/wagering/bet', body);
        const secondResponse = await post('/wagering/bet', body);

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);

        const firstTransaction = await firstResponse.json();
        const secondTransaction = await secondResponse.json();

        expect(secondTransaction.id).toBe(firstTransaction.id);

        const wallet = await getWallet(playerId);

        expect(wallet.balance.amount).toBe('70.00');
        expect(wallet.version).toBe(2);
    });

    it('deve rejeitar reutilização da chave com valor diferente', async () => {
        const playerId = randomUUID();

        await createWallet(playerId);

        const body = createWageringBody(playerId, '30.00');

        const firstResponse = await post('/wagering/bet', body);

        expect(firstResponse.status).toBe(200);

        const secondResponse = await post('/wagering/bet', {
            ...body,
            amount: '40.00',
        });

        expect(secondResponse.status).toBe(409);

        const wallet = await getWallet(playerId);

        expect(wallet.balance.amount).toBe('70.00');
        expect(wallet.version).toBe(2);
    });

    it('não deve permitir BET com saldo insuficiente', async () => {
        const playerId = randomUUID();

        await createWallet(playerId);

        const response = await post(
            '/wagering/bet',
            createWageringBody(playerId, '200.00'),
        );

        expect(response.status).toBe(422);

        const wallet = await getWallet(playerId);

        expect(wallet.balance.amount).toBe('100.00');
        expect(wallet.version).toBe(1);
    });
});
