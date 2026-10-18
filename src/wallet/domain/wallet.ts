import { randomUUID } from 'node:crypto';
import { Money } from '../../shared/domain/money';


// modelagem
export class Wallet {
    private constructor(
        public readonly id: string,
        public readonly playerId: string,
        public readonly currency: string,
        private balance: Money,
        private version: number,
        public readonly createdAt: Date,
        private updatedAt: Date,
    ) { }

    static open(playerId: string, currency: string): Wallet {
        if (!playerId) {
            throw new Error('O identificador do jogador é obrigatório.');
        }

        const initialBalance = Money.zero(currency);
        const now = new Date();

        return new Wallet(
            randomUUID(),
            playerId,
            currency,
            initialBalance,
            0,
            now,
            now,
        );
    }

    static rehydrate(props: {
        id: string;
        playerId: string;
        currency: string;
        balance: Money;
        version: number;
        createdAt: Date;
        updatedAt: Date;
    }): Wallet {
        if (props.balance.currency !== props.currency) {
            throw new Error('A moeda do saldo não corresponde à moeda da carteira.');
        }

        if (props.balance.isNegative()) {
            throw new Error('O saldo da carteira não pode ser negativo.');
        }

        if (!Number.isInteger(props.version) || props.version < 0) {
            throw new Error('A versão da carteira é inválida.');
        }

        return new Wallet(
            props.id,
            props.playerId,
            props.currency,
            props.balance,
            props.version,
            new Date(props.createdAt),
            new Date(props.updatedAt),
        );
    }

    getBalance(): Money {
        return this.balance;
    }

    getVersion(): number {
        return this.version;
    }

    getUpdatedAt(): Date {
        return new Date(this.updatedAt);
    }

    //metodo credito e debito
    credit(amount: Money): void {
        if (amount.currency !== this.currency) {
            throw new Error('A moeda da operação é diferente da moeda da carteira.');
        }

        if (amount.isNegative() || amount.toJSON().amount === '0.00') {
            throw new Error('O valor do crédito deve ser maior que zero.');
        }

        this.balance = this.balance.add(amount);
        this.version++;
        this.updatedAt = new Date();
    }


    debit(amount: Money): void {
        if (amount.currency !== this.currency) {
            throw new Error('A moeda da operação é diferente da moeda da carteira.');
        }

        if (amount.isNegative() || amount.toJSON().amount === '0.00') {
            throw new Error('O valor do débito deve ser maior que zero.');
        }

        if (this.balance.isLessThan(amount)) {
            throw new Error('Saldo insuficiente para realizar a operação.');
        }

        this.balance = this.balance.subtract(amount);
        this.version++;
        this.updatedAt = new Date();
    }

}
