import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Wallet } from './domain/wallet';
import { WalletRepository } from './infrastructure/persistence/wallet.repository';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { Money } from '../shared/domain/money';
import { WalletMapper } from './infrastructure/persistence/wallet.mapper';
import { UnprocessableEntityException } from '@nestjs/common';
import { WalletTransactionRepository } from './infrastructure/persistence/transaction/wallet-transaction.repository';
import { BadRequestException } from '@nestjs/common';


@Injectable()
export class WalletService {
    constructor(
        private readonly walletRepository: WalletRepository,
        private readonly walletTransactionRepository: WalletTransactionRepository,
    ) { }

    //abre uma nova carteira para o jogador
    async openWallet(
        playerId: string,
        currency: string,
    ): Promise<Wallet> {
        const existingWallet =
            await this.walletRepository.findByPlayerAndCurrency(
                playerId,
                currency,
            );

        if (existingWallet) {
            throw new ConflictException(
                'O jogador já possui uma carteira nesta moeda.',
            );
        }

        const wallet = Wallet.open(playerId, currency);


        try {
            await this.walletRepository.create(wallet);
        } catch (error) {
            if (error instanceof UniqueConstraintViolationException) {
                throw new ConflictException(
                    'O jogador já possui uma carteira nesta moeda.',
                );
            }

            throw error;
        }

        return wallet;

    }

    //consulta uma carteira existente
    async getWallet(
        playerId: string,
        currency: string,
    ): Promise<Wallet> {
        const wallet =
            await this.walletRepository.findByPlayerAndCurrency(
                playerId,
                currency,
            );

        if (!wallet) {
            throw new NotFoundException(
                'Carteira não encontrada para este jogador e moeda.',
            );
        }

        return wallet;
    }


    //metodo credito
    async credit(
        playerId: string,
        currency: string,
        amount: string,
        idempotencyKey: string,
    ): Promise<Wallet> {

        //valida a chave antes de iniciar a transacao
        if (
            !idempotencyKey ||
            idempotencyKey.trim().length === 0 ||
            idempotencyKey.length > 100
        ) {
            throw new BadRequestException(
                'A chave de idempotência é obrigatória e deve ter até 100 caracteres.',
            );
        }

        return this.walletRepository.executeInTransaction(
            async (entityManager) => {

                //bloqueia a carteira durante a movimentacao
                const entity =
                    await this.walletRepository.findByPlayerAndCurrencyForUpdate(
                        entityManager,
                        playerId,
                        currency,
                    );

                if (!entity) {
                    throw new NotFoundException(
                        'Carteira não encontrada para este jogador e moeda.',
                    );
                }

                const wallet = WalletMapper.toDomain(entity);

                const money = Money.from({
                    amount,
                    currency,
                });

                //consulta uma operacao anterior com a mesma chave
                const existingTransaction =
                    await this.walletTransactionRepository.findByIdempotencyKey(
                        entityManager,
                        idempotencyKey,
                    );

                if (existingTransaction) {

                    const sameOperation =
                        existingTransaction.walletId === wallet.id &&
                        existingTransaction.type === 'CREDIT' &&
                        existingTransaction.amount === money.toJSON().amount;

                    if (!sameOperation) {
                        throw new ConflictException(
                            'A chave de idempotência já foi utilizada com dados diferentes.',
                        );
                    }


                    if (!existingTransaction.walletUpdatedAt) {
                        throw new ConflictException(
                            'Esta operação já foi processada, mas seu resultado histórico não está disponível.',
                        );
                    }

                    //retorna o resultado original sem executar outro credito
                    return Wallet.rehydrate({
                        id: wallet.id,
                        playerId: wallet.playerId,
                        currency: wallet.currency,
                        balance: Money.from({
                            amount: existingTransaction.balanceAfter,
                            currency: wallet.currency,
                        }),
                        version: existingTransaction.versionAfter,
                        createdAt: wallet.createdAt,
                        updatedAt: existingTransaction.walletUpdatedAt,
                    });
                }

                //executa o credito uma enica vez
                wallet.credit(money);

                //atualiza o saldo da carteira
                await this.walletRepository.updateBalance(
                    entityManager,
                    entity,
                    wallet,
                );

                //registra a movimentacao no ledger
                await this.walletTransactionRepository.create(
                    entityManager,
                    {
                        walletId: wallet.id,
                        type: 'CREDIT',
                        amount: money.toJSON().amount,
                        balanceAfter: wallet.getBalance().toJSON().amount,
                        versionAfter: wallet.getVersion(),
                        idempotencyKey,
                        walletUpdatedAt: wallet.getUpdatedAt()
                    },
                );

                return wallet;
            },
        );
    }



    //metodo de debito
    async debit(
        playerId: string,
        currency: string,
        amount: string,
        idempotencyKey: string,
    ): Promise<Wallet> {

        //valida a chave antes de iniciar a transacao
        if (
            !idempotencyKey ||
            idempotencyKey.trim().length === 0 ||
            idempotencyKey.length > 100
        ) {
            throw new BadRequestException(
                'A chave de idempotência é obrigatória e deve ter até 100 caracteres.',
            );
        }

        return this.walletRepository.executeInTransaction(
            async (entityManager) => {

                //bloqueia a carteira durante a movimentacao
                const entity =
                    await this.walletRepository.findByPlayerAndCurrencyForUpdate(
                        entityManager,
                        playerId,
                        currency,
                    );

                if (!entity) {
                    throw new NotFoundException(
                        'Carteira não encontrada para este jogador e moeda.',
                    );
                }

                const wallet = WalletMapper.toDomain(entity);

                const money = Money.from({
                    amount,
                    currency,
                });

                //verifica se a chave de idempotencia já foi usada
                const existingTransaction =
                    await this.walletTransactionRepository.findByIdempotencyKey(
                        entityManager,
                        idempotencyKey,
                    );

                if (existingTransaction) {

                    //confere se a chave pertence a mesma operacao
                    const sameOperation =
                        existingTransaction.walletId === wallet.id &&
                        existingTransaction.type === 'DEBIT' &&
                        existingTransaction.amount === money.toJSON().amount;

                    //mesma chave utilizada com dados diferentes
                    if (!sameOperation) {
                        throw new ConflictException(
                            'A chave de idempotência já foi utilizada com dados diferentes.',
                        );
                    }

                    //operacap antiga sem historico completo
                    if (!existingTransaction.walletUpdatedAt) {
                        throw new ConflictException(
                            'Esta operação já foi processada, mas seu resultado histórico não está disponível.',
                        );
                    }

                    //retorna o resultado historico sem executar outro débito
                    return Wallet.rehydrate({
                        id: wallet.id,
                        playerId: wallet.playerId,
                        currency: wallet.currency,
                        balance: Money.from({
                            amount: existingTransaction.balanceAfter,
                            currency: wallet.currency,
                        }),
                        version: existingTransaction.versionAfter,
                        createdAt: wallet.createdAt,
                        updatedAt: existingTransaction.walletUpdatedAt,
                    });
                }

                //executa o debito
                try {
                    wallet.debit(money);
                } catch (error) {
                    if (
                        error instanceof Error &&
                        error.message ===
                        'Saldo insuficiente para realizar a operação.'
                    ) {
                        throw new UnprocessableEntityException(
                            error.message,
                        );
                    }

                    throw error;
                }

                //atualiza o saldo da carteira
                await this.walletRepository.updateBalance(
                    entityManager,
                    entity,
                    wallet,
                );

                //registra a movimentacaoo no ledger
                await this.walletTransactionRepository.create(
                    entityManager,
                    {
                        walletId: wallet.id,
                        type: 'DEBIT',
                        amount: money.toJSON().amount,
                        balanceAfter: wallet.getBalance().toJSON().amount,
                        versionAfter: wallet.getVersion(),
                        walletUpdatedAt: wallet.getUpdatedAt(),
                        idempotencyKey,
                    },
                );

                return wallet;
            },
        );
    }



}