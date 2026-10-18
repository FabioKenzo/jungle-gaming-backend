import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException, } from '@nestjs/common';

import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { WalletRepository } from '../wallet/infrastructure/persistence/wallet.repository';
import { WalletTransactionRepository } from '../wallet/infrastructure/persistence/transaction/wallet-transaction.repository';
import { WageringTransactionRepository } from './infrastructure/persistence/wagering-transaction.repository';
import { WalletMapper } from '../wallet/infrastructure/persistence/wallet.mapper';
import { Money } from '../shared/domain/money';
import { WageringTransactionEntity } from './infrastructure/persistence/wagering-transaction.entity';

export interface ProcessWageringInput {
    playerId: string;
    currency: string;
    amount: string;
    idempotencyKey: string;
    providerId: string;
    externalTransactionId: string;
    roundId?: string;
    gameId?: string;
}

@Injectable()
export class WageringService {
    constructor(
        private readonly walletRepository: WalletRepository,
        private readonly walletTransactionRepository: WalletTransactionRepository,
        private readonly wageringTransactionRepository: WageringTransactionRepository,
    ) { }

    async bet(input: ProcessWageringInput): Promise<WageringTransactionEntity> {
        return this.process(input, 'BET');
    }

    async win(input: ProcessWageringInput): Promise<WageringTransactionEntity> {
        return this.process(input, 'WIN');
    }

    private async process(
        input: ProcessWageringInput,
        type: 'BET' | 'WIN',
    ): Promise<WageringTransactionEntity> {
        if (!input.idempotencyKey?.trim()) {
            throw new BadRequestException(
                'A chave de idempotência é obrigatória.',
            );
        }

        if (!input.providerId?.trim() || !input.externalTransactionId?.trim()) {
            throw new BadRequestException(
                'providerId e externalTransactionId são obrigatórios.',
            );
        }

        const money = Money.from({
            amount: input.amount,
            currency: input.currency,
        });

        if (money.toJSON().amount === '0.00' || money.isNegative()) {
            throw new BadRequestException(
                'O valor da operação deve ser maior que zero.',
            );
        }

        try {
            return await this.walletRepository.executeInTransaction(
                async (entityManager) => {
                    // Bloqueia a carteira para evitar movimentações concorrentes.
                    const walletEntity =
                        await this.walletRepository.findByPlayerAndCurrencyForUpdate(
                            entityManager,
                            input.playerId,
                            input.currency,
                        );

                    if (!walletEntity) {
                        throw new NotFoundException('Carteira não encontrada.');
                    }

                    const wallet = WalletMapper.toDomain(walletEntity);

                    // Verifica se a chave de idempotência já foi utilizada.
                    const existing =
                        await this.wageringTransactionRepository.findByIdempotencyKey(
                            entityManager,
                            input.idempotencyKey,
                        );

                    if (existing) {
                        const sameOperation =
                            existing.walletId === wallet.id &&
                            existing.type === type &&
                            existing.amount === money.toJSON().amount &&
                            existing.providerId === input.providerId &&
                            existing.externalTransactionId === input.externalTransactionId;

                        if (!sameOperation) {
                            throw new ConflictException(
                                'Chave de idempotência utilizada com dados diferentes.',
                            );
                        }

                        return existing;
                    }

                    // Impede reutilização do identificador externo.
                    const existingExternal =
                        await this.wageringTransactionRepository.findByExternalTransactionId(
                            entityManager,
                            input.providerId,
                            input.externalTransactionId,
                        );

                    if (existingExternal) {
                        throw new ConflictException(
                            'Transação externa já registrada.',
                        );
                    }

                    // BET debita; WIN credita.
                    if (type === 'BET') {
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
                    } else {
                        wallet.credit(money);
                    }

                    // Atualiza o saldo dentro da mesma transação SQL.
                    await this.walletRepository.updateBalance(
                        entityManager,
                        walletEntity,
                        wallet,
                    );

                    // Registra a operação financeira.
                    const wagering =
                        await this.wageringTransactionRepository.create(
                            entityManager,
                            {
                                walletId: wallet.id,
                                playerId: input.playerId,
                                currency: input.currency,
                                type,
                                amount: money.toJSON().amount,
                                idempotencyKey: input.idempotencyKey,
                                providerId: input.providerId,
                                externalTransactionId: input.externalTransactionId,
                                roundId: input.roundId,
                                gameId: input.gameId,
                            },
                        );

                    // Registra o lançamento vinculado à operação.
                    await this.walletTransactionRepository.create(
                        entityManager,
                        {
                            walletId: wallet.id,
                            transactionId: wagering.id,
                            type: type === 'BET' ? 'DEBIT' : 'CREDIT',
                            amount: money.toJSON().amount,
                            balanceAfter: wallet.getBalance().toJSON().amount,
                            versionAfter: wallet.getVersion(),
                            walletUpdatedAt: wallet.getUpdatedAt(),
                            idempotencyKey: `wagering:${wagering.id}`,
                        },
                    );

                    return wagering;
                },
            );
        } catch (error) {
            if (error instanceof UniqueConstraintViolationException) {
                throw new ConflictException(
                    'Transação duplicada ou chave de idempotência já utilizada.',
                );
            }

            throw error;
        }
    }
}
