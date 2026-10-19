import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
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
    referenceExternalTransactionId?: string;

}

@Injectable()
export class WageringService {

    constructor(
        private readonly walletRepository: WalletRepository,
        private readonly walletTransactionRepository: WalletTransactionRepository,
        private readonly wageringTransactionRepository: WageringTransactionRepository,

    ) {}

    async bet(input: ProcessWageringInput): Promise<WageringTransactionEntity> {
        return this.process(input, 'BET');
    }

    async win(input: ProcessWageringInput): Promise<WageringTransactionEntity> {
        return this.process(input, 'WIN');
    }

    async loss(input: ProcessWageringInput): Promise<WageringTransactionEntity> {
        return this.process(input, 'LOSS');

    }

    async refund(input: ProcessWageringInput): Promise<WageringTransactionEntity> {

        // Valida a referência antes de iniciar a transação.
        if (!input.referenceExternalTransactionId?.trim()) {
            throw new BadRequestException('referenceExternalTransactionId é obrigatório para REFUND.',);
        }

        const referenceExternalTransactionId = input.referenceExternalTransactionId.trim();

        if (
            !input.idempotencyKey?.trim() ||
            !input.providerId?.trim() ||
            !input.externalTransactionId?.trim()

        ) {
            throw new BadRequestException('idempotencyKey, providerId e externalTransactionId são obrigatórios.',);
        }

        const money = Money.from({
            amount: input.amount,
            currency: input.currency,
        });

        if (money.isNegative() || money.toJSON().amount === '0.00') {

            throw new BadRequestException('O valor do reembolso deve ser maior que zero.', );
        }

        try {

            return await this.walletRepository.executeInTransaction(

                async (entityManager) => {

                    // Bloqueia a carteira durante o processamento.
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

                    // Impede que a mesma chave gere outro reembolso.
                    const existing =
                        await this.wageringTransactionRepository.findByIdempotencyKey(
                            entityManager,
                            input.idempotencyKey,
                        );

                    if (existing) {
                        const sameOperation =
                            existing.walletId === wallet.id &&
                            existing.type === 'REFUND' &&
                            existing.amount === money.toJSON().amount &&
                            existing.providerId === input.providerId &&
                            existing.externalTransactionId === input.externalTransactionId &&
                            existing.referenceExternalTransactionId ===
                            referenceExternalTransactionId;

                        if (!sameOperation) {

                            throw new ConflictException('Chave de idempotência utilizada com dados diferentes.');
                        }
                        return existing;
                    }

                    // Impede reutilizar o identificador externo.
                    const existingExternal =
                        await this.wageringTransactionRepository.findByExternalTransactionId(
                            entityManager,
                            input.providerId,
                            input.externalTransactionId,
                        );

                    if (existingExternal) {

                        throw new ConflictException('Transação externa já registrada.',);
                    }

                    // Busca a BET que será reembolsada.
                    const original =
                    await this.wageringTransactionRepository.findByExternalTransactionId(
                            entityManager,
                            input.providerId,
                            referenceExternalTransactionId,
                        );

                    // Se a referência não existe, registra como pendente.
                    if (!original) {

                        return this.wageringTransactionRepository.create(entityManager,

                            {
                                walletId: wallet.id,
                                playerId: input.playerId,
                                currency: input.currency,
                                type: 'REFUND',
                                status: 'PENDING_REFERENCE',
                                amount: money.toJSON().amount,
                                idempotencyKey: input.idempotencyKey,
                                providerId: input.providerId,
                                externalTransactionId: input.externalTransactionId,
                                referenceExternalTransactionId,
                                roundId: input.roundId,
                                gameId: input.gameId,
                            },

                        );
                    }

                    // Confirma que a referência é uma BET processada
                    // pertencente à mesma carteira.
                    if (original.type !== 'BET' || original.status !== 'PROCESSED' || original.walletId !== wallet.id || original.currency !== input.currency) {

                        throw new UnprocessableEntityException('A transação referenciada não é uma BET válida para esta carteira.',);
                    }

                    // Verifica se já houve reembolso da aposta.
                    const refunds = await this.wageringTransactionRepository.findRefundsByReference(entityManager,original.id,);

                    if (refunds.length > 0) {
                        throw new ConflictException('Esta aposta já foi reembolsada.',);
                    }

                    // Por enquanto, permite apenas reembolso integral.
                    if (original.amount !== money.toJSON().amount) {
                        throw new UnprocessableEntityException(
                            'O reembolso deve corresponder ao valor integral da BET.');

                    }

                    // Devolve o dinheiro para a carteira.
                    wallet.credit(money);
                    await this.walletRepository.updateBalance(
                        entityManager,
                        walletEntity,
                        wallet,
                    );

                    // Registra o REFUND vinculado à BET original.
                    const wagering =
                        await this.wageringTransactionRepository.create(
                            entityManager,
                            {
                                walletId: wallet.id,

                                playerId: input.playerId,

                                currency: input.currency,

                                type: 'REFUND',

                                status: 'PROCESSED',

                                amount: money.toJSON().amount,

                                idempotencyKey: input.idempotencyKey,

                                providerId: input.providerId,

                                externalTransactionId: input.externalTransactionId,

                                referenceExternalTransactionId,

                                referenceTransactionId: original.id,

                                roundId: input.roundId,

                                gameId: input.gameId,
                            },

                        );

                    // Registra o crédito no ledger.
                    await this.walletTransactionRepository.create(
                        entityManager,
                        {
                            walletId: wallet.id,

                            transactionId: wagering.id,

                            type: 'CREDIT',

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

                throw new ConflictException('Transação duplicada ou chave de idempotência já utilizada.',);

            }
            throw error;
        }
    }
    async rollback(input: ProcessWageringInput): Promise<WageringTransactionEntity> {
        if (!input.referenceExternalTransactionId?.trim()) {
            throw new BadRequestException(
                'referenceExternalTransactionId é obrigatório para ROLLBACK.',
            );
        }

        const referenceExternalTransactionId = input.referenceExternalTransactionId.trim();

        if (
            !input.idempotencyKey?.trim() ||
            !input.providerId?.trim() ||
            !input.externalTransactionId?.trim()
        ) {
            throw new BadRequestException('idempotencyKey, providerId e externalTransactionId são obrigatórios.',);
        }

        const money = Money.from({ amount: input.amount, currency: input.currency });
        const amount = money.toJSON().amount;
        if (money.isNegative() || amount === '0.00') {
            throw new BadRequestException('O valor do rollback deve ser maior que zero.');
        }

        try {
            return await this.walletRepository.executeInTransaction(
                async (entityManager) => {
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
                    const existing =
                        await this.wageringTransactionRepository.findByIdempotencyKey(
                            entityManager,
                            input.idempotencyKey,
                        );

                    if (existing) {
                        const sameOperation =
                            existing.walletId === wallet.id &&
                            existing.type === 'ROLLBACK' &&
                            existing.amount === amount &&
                            existing.providerId === input.providerId &&
                            existing.externalTransactionId === input.externalTransactionId &&
                            existing.referenceExternalTransactionId === referenceExternalTransactionId;

                        if (!sameOperation) {
                            throw new ConflictException('Chave de idempotência utilizada com dados diferentes.',);
                        }
                        return existing;
                    }

                    const existingExternal =
                        await this.wageringTransactionRepository.findByExternalTransactionId(
                            entityManager,
                            input.providerId,
                            input.externalTransactionId,
                        );
                    if (existingExternal) {
                        throw new ConflictException('Transação externa já registrada.');
                    }

                    const original =
                        await this.wageringTransactionRepository.findByExternalTransactionId(
                            entityManager,
                            input.providerId,
                            referenceExternalTransactionId,
                        );

                    if (!original) {
                        // Sem referência não há movimentação financeira.
                        return this.wageringTransactionRepository.create(entityManager, {
                            walletId: wallet.id,
                            playerId: input.playerId,
                            currency: input.currency,
                            type: 'ROLLBACK',
                            status: 'PENDING_REFERENCE',
                            amount,
                            idempotencyKey: input.idempotencyKey,
                            providerId: input.providerId,
                            externalTransactionId: input.externalTransactionId,
                            referenceExternalTransactionId,
                            roundId: input.roundId,
                            gameId: input.gameId,
                        });
                    }

                    if (
                        original.status !== 'PROCESSED' ||
                        original.walletId !== wallet.id ||
                        original.currency !== input.currency ||
                        !['BET', 'WIN', 'LOSS', 'REFUND'].includes(original.type)
                    ) {
                        throw new UnprocessableEntityException('A transação referenciada não pode ser revertida nesta carteira.',);
                    }

                    if (original.amount !== amount) {
                        throw new UnprocessableEntityException('O valor do rollback deve ser igual ao da transação original.',);
                    }

                    const previousRollback =
                        await this.wageringTransactionRepository.findRollbackByReference(
                            entityManager,
                            original.id,
                        );
                    if (previousRollback) {
                        throw new ConflictException('Esta transação já foi revertida.');
                    }

                    if (original.type === 'BET') {
                        const refunds =
                            await this.wageringTransactionRepository.findRefundsByReference(
                                entityManager,
                                original.id,
                            );
                        if (refunds.length > 0) {
                            throw new ConflictException('Esta BET já foi reembolsada e não pode receber rollback.',);
                        }
                    }

                    // BET foi débito: reverte com crédito.
                    // WIN e REFUND foram créditos: revertem com débito.
                    // LOSS não movimentou saldo: rollback também não movimenta.
                    let ledgerType: 'CREDIT' | 'DEBIT' | null = null;
                    if (original.type === 'BET') {
                        wallet.credit(money);
                        ledgerType = 'CREDIT';
                    } else if (original.type === 'WIN' || original.type === 'REFUND') {
                        try {
                            wallet.debit(money);
                        } catch (error) {
                            if (
                                error instanceof Error &&
                                error.message === 'Saldo insuficiente para realizar a operação.'
                            ) {
                                throw new UnprocessableEntityException(error.message);
                            }
                            throw error;
                        }
                        ledgerType = 'DEBIT';
                    }

                    if (ledgerType !== null) {
                        await this.walletRepository.updateBalance(
                            entityManager,
                            walletEntity,
                            wallet,
                        );
                    }

                    const wagering =
                        await this.wageringTransactionRepository.create(entityManager, {
                            walletId: wallet.id,
                            playerId: input.playerId,
                            currency: input.currency,
                            type: 'ROLLBACK',
                            status: 'PROCESSED',
                            amount,
                            idempotencyKey: input.idempotencyKey,
                            providerId: input.providerId,
                            externalTransactionId: input.externalTransactionId,
                            referenceExternalTransactionId,
                            referenceTransactionId: original.id,
                            roundId: input.roundId,
                            gameId: input.gameId,
                        });

                    if (ledgerType !== null) {
                        await this.walletTransactionRepository.create(entityManager, {
                            walletId: wallet.id,
                            transactionId: wagering.id,
                            type: ledgerType,
                            amount,
                            balanceAfter: wallet.getBalance().toJSON().amount,
                            versionAfter: wallet.getVersion(),
                            walletUpdatedAt: wallet.getUpdatedAt(),
                            idempotencyKey: `wagering:${wagering.id}`,
                        });
                    }

                    return wagering;
                },
            );
        } catch (error) {
            if (error instanceof UniqueConstraintViolationException) {

                throw new ConflictException('Transação duplicada ou chave de idempotência já utilizada.',);
            }
            throw error;
        }
    }

    private async process(
        input: ProcessWageringInput,

        type: 'BET' | 'WIN' | 'LOSS',
    ): Promise<WageringTransactionEntity> {

        if (!input.idempotencyKey?.trim()) {

            throw new BadRequestException('A chave de idempotência é obrigatória.',);
        }

        if (!input.providerId?.trim() || !input.externalTransactionId?.trim()) {
            throw new BadRequestException('providerId e externalTransactionId são obrigatórios.',);
        }

        const money = Money.from({
            amount: input.amount,
            currency: input.currency,
        });
        if (money.toJSON().amount === '0.00' || money.isNegative()) {

            throw new BadRequestException('O valor da operação deve ser maior que zero.',);

        }

        try {

            return await this.walletRepository.executeInTransaction(

                async (entityManager) => {
                    // Bloqueia a carteira contra movimentações concorrentes.
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

                    // Verifica se a operação já foi processada.
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

                            throw new ConflictException('Chave de idempotência utilizada com dados diferentes.',);

                        }

                        return existing;
                    }

                    // Impede identificadores externos duplicados.
                    const existingExternal =

                        await this.wageringTransactionRepository.findByExternalTransactionId(

                            entityManager,

                            input.providerId,

                            input.externalTransactionId,

                        );
                    if (existingExternal) {

                        throw new ConflictException('Transação externa já registrada.',);
                    }

                    // BET debita, WIN credita e LOSS não movimenta saldo.
                    if (type === 'BET') {
                        try {

                            wallet.debit(money);

                        } catch (error) {

                            if (

                                error instanceof Error &&

                                error.message ==='Saldo insuficiente para realizar a operação.'

                            ) {

                                throw new UnprocessableEntityException(

                                    error.message,

                                );

                            }

                            throw error;
                        }

                    } else if (type === 'WIN') {

                        wallet.credit(money);

                    }

                    // LOSS não altera o saldo nem a versão da carteira.
                    if (type !== 'LOSS') {

                        await this.walletRepository.updateBalance(

                            entityManager,

                            walletEntity,

                            wallet,

                        );

                    }
                    // Todas as operações são registradas no wagering.
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

                    // Apenas BET e WIN geram movimentações no ledger.
                    if (type !== 'LOSS') {

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

                    }
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
