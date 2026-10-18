import { randomUUID } from 'node:crypto';
import { describe, it, expect } from '@jest/globals';


describe('Wallet - Concorrência (E2E)', () => {
    const baseUrl = 'http://localhost:3000';

    const playerId = randomUUID();
    const currency = 'BRL';

    async function post(
        path: string,
        body: Record<string, string>,
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

    it('não deve permitir saldo negativo em débitos simultâneos', async () => {
        // Cria uma carteira exclusiva para este teste
        const createResponse = await post('/wallets', {
            playerId,
            currency,
        });

        expect(createResponse.status).toBe(201);

        const walletPath = `/wallets/${playerId}/${currency}`;

        // Adiciona R$ 30,00 de saldo inicial
        const creditResponse = await post(
            `${walletPath}/credit`,
            { amount: '30.00' },
            randomUUID(),
        );

        expect(creditResponse.status).toBe(200)

        // Dispara dois débitos de R$ 20,00 simultaneamente
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

        // Falhas de transporte devem fazer o teste falhar
        for (const result of results) {
            expect(result.status).toBe('fulfilled');
        }

        const responses = results.map(
            (result) =>
                (result as PromiseFulfilledResult<Response>).value,
        );

        const statuses = responses.map((response) => response.status);

        // Uma operação deve ser aprovada e outra rejeitada
        expect(statuses.sort()).toEqual([200, 422]);

        // Consulta o saldo final da carteira
        const walletResponse = await fetch(`${baseUrl}${walletPath}`);

        expect(walletResponse.status).toBe(200);

        const wallet = await walletResponse.json();

        expect(wallet.balance.amount).toBe('10.00');
        expect(wallet.version).toBe(2);
    });
});
