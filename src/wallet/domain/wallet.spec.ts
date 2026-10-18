import { Wallet } from './wallet';
import { Money } from '../../shared/domain/money';
import { describe, it, expect } from '@jest/globals';

//testes (parecido com junit 5 n esquece)

describe('Wallet', () => {
  const playerId = '550e8400-e29b-41d4-a716-446655440000';

  it('deve criar uma carteira com saldo zero', () => {
    const wallet = Wallet.open(playerId, 'BRL');

    expect(wallet.getBalance().toJSON().amount).toBe('0.00');
    expect(wallet.getVersion()).toBe(0);
  });

  it('deve adicionar dinheiro ao saldo', () => {
    const wallet = Wallet.open(playerId, 'BRL');

    const amount = Money.from({
      amount: '100.00',
      currency: 'BRL',
    });

    wallet.credit(amount);

    expect(wallet.getBalance().toJSON().amount).toBe('100.00');
    expect(wallet.getVersion()).toBe(1);
  });

  it('deve descontar dinheiro do saldo', () => {
    const wallet = Wallet.open(playerId, 'BRL');

    wallet.credit(
      Money.from({ amount: '100.00', currency: 'BRL' }),
    );

    wallet.debit(
      Money.from({ amount: '30.00', currency: 'BRL' }),
    );

    expect(wallet.getBalance().toJSON().amount).toBe('70.00');
    expect(wallet.getVersion()).toBe(2);
  });

  it('não deve permitir débito com saldo insuficiente', () => {
    const wallet = Wallet.open(playerId, 'BRL');

    const amount = Money.from({
      amount: '50.00',
      currency: 'BRL',
    });

    expect(() => wallet.debit(amount)).toThrow(
      'Saldo insuficiente para realizar a operação.',
    );
  });

  
it('não deve permitir crédito com moeda diferente', () => {
  const wallet = Wallet.open(playerId, 'BRL');

  const amount = Money.from({
    amount: '50.00',
    currency: 'USD',
  });

  expect(() => wallet.credit(amount)).toThrow(
    'A moeda da operação é diferente da moeda da carteira.',
  );

  expect(wallet.getBalance().toJSON().amount).toBe('0.00');
});

it('não deve permitir crédito com valor zero', () => {
  const wallet = Wallet.open(playerId, 'BRL');

  const amount = Money.zero('BRL');

  expect(() => wallet.credit(amount)).toThrow(
    'O valor do crédito deve ser maior que zero.',
  );

  expect(wallet.getBalance().toJSON().amount).toBe('0.00');
});

});
