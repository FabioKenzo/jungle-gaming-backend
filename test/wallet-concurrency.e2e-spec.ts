import { randomUUID } from 'node:crypto';
import { describe, it, expect } from '@jest/globals';

describe('Wallet - Concorrência (E2E)', () => {
    const baseUrl = 'http://localhost:3000';
    const currency = 'BRL';

    async function post(
        path: string,
        body: Record<string, unknown>,
        idempotencyKey?: string,
    ): Promise<Response> {
        return fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(idempotencyKey
                    ? { 'Idempotency-Key': idempotencyKey }
                    : {}),
            },
            body: JSON.stringify(body),
        });
    }

    async function createWallet(playerId: string): Promise<Response> {
        return post('/wallets', {
            playerId,
            initialBalance: {
                amount: '0.00',
                currency,
            },
        });
    }

    it('não deve permitir saldo negativo em débitos simultâneos', async () => {
        const playerId = randomUUID();
        const walletPath = `/wallets/${playerId}/${currency}`;

        // Cria uma carteira exclusiva para este teste.
        const createResponse = await createWallet(playerId);

        expect(createResponse.status).toBe(201);

        // Adiciona R$ 30,00 ao saldo.
        const creditResponse = await post(
            `${walletPath}/credit`,
            { amount: '30.00' },
            randomUUID(),
        );

        expect(creditResponse.status).toBe(200);

        // Dispara dois débitos de R$ 20,00 simultaneamente.
        const results = await Promise.allSettled([
            post(
                `${walletPath}/debit`,
                { amount: '20.00' },
                randomUUID(),
            ),
            post(
                `${walletPath}/debit`,
                { amount: '20.00' },
                randomUUID(),
            ),
        ]);

        // Falhas de transporte devem fazer o teste falhar.
        for (const result of results) {
            expect(result.status).toBe('fulfilled');
        }

        const responses = results.map(
            (result) =>
                (result as PromiseFulfilledResult<Response>).value,
        );

        const statuses = responses
            .map((response) => response.status)
            .sort((a, b) => a - b);

        // Apenas um débito deve ser aprovado.
        expect(statuses).toEqual([200, 422]);

        // Consulta o saldo final da carteira.
        const walletResponse = await fetch(
            `${baseUrl}${walletPath}`,
        );

        expect(walletResponse.status).toBe(200);

        const wallet = await walletResponse.json();

        // 30 - 20 = 10.
        expect(wallet.balance.amount).toBe('10.00');

        // Versão 1 (abertura) + 1 (crédito) + 1 (débito).
        expect(wallet.version).toBe(3);
    });

    it('deve rejeitar a mesma chave de idempotência em carteiras diferentes', async () => {
        const playerA = randomUUID();
        const playerB = randomUUID();
        const idempotencyKey = randomUUID();

        const walletA = `/wallets/${playerA}/${currency}`;
        const walletB = `/wallets/${playerB}/${currency}`;

        // Cria duas carteiras independentes, com saldo zero.
        const creationResults = await Promise.all([
            createWallet(playerA),
            createWallet(playerB),
        ]);

        expect(
            creationResults.map((response) => response.status),
        ).toEqual([201, 201]);

        // Tenta creditar duas carteiras usando a mesma chave.
        const responses = await Promise.all([
            post(
                `${walletA}/credit`,
                { amount: '20.00' },
                idempotencyKey,
            ),
            post(
                `${walletB}/credit`,
                { amount: '20.00' },
                idempotencyKey,
            ),
        ]);

        const statuses = responses
            .map((response) => response.status)
            .sort((a, b) => a - b);

        // Uma operação deve funcionar; a outra deve retornar conflito.
        expect(statuses).toEqual([200, 409]);

        // Consulta os saldos persistidos.
        const [responseA, responseB] = await Promise.all([
            fetch(`${baseUrl}${walletA}`),
            fetch(`${baseUrl}${walletB}`),
        ]);

        expect(responseA.status).toBe(200);
        expect(responseB.status).toBe(200);

        const [resultA, resultB] = await Promise.all([
            responseA.json(),
            responseB.json(),
        ]);

        const balances = [
            resultA.balance.amount,
            resultB.balance.amount,
        ].sort();

        // Apenas uma carteira deve receber o crédito.
        expect(balances).toEqual(['0.00', '20.00']);

        const versions = [
            resultA.version,
            resultB.version,
        ].sort((a: number, b: number) => a - b);

        // Carteira sem crédito: versão 1.
        // Carteira creditada: versão 2.
        expect(versions).toEqual([1, 2]);
    });
});

