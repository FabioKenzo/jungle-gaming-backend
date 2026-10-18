import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';

import { Wallet } from '../../domain/wallet';
import { WalletEntity } from './wallet.entity';
import { WalletMapper } from './wallet.mapper';
import { EntityManager, LockMode, } from '@mikro-orm/postgresql';

@Injectable()
export class WalletRepository {
    constructor(
        @InjectRepository(WalletEntity)
        private readonly repository: EntityRepository<WalletEntity>,
    ) { }

    async findByPlayerAndCurrency(
        playerId: string,
        currency: string,
    ): Promise<Wallet | null> {
        const entity = await this.repository.findOne({
            playerId,
            currency,
        });

        return entity ? WalletMapper.toDomain(entity) : null;
    }


    async create(wallet: Wallet): Promise<void> {
        const entity = WalletMapper.toEntity(wallet);

        const entityManager = this.repository.getEntityManager();

        entityManager.persist(entity);
        await entityManager.flush();
    }


    async findByPlayerAndCurrencyForUpdate(
        entityManager: EntityManager,
        playerId: string,
        currency: string,
    ): Promise<WalletEntity | null> {
        return entityManager.findOne(
            WalletEntity,
            { playerId, currency },
            { lockMode: LockMode.PESSIMISTIC_WRITE },
        );
    }


    async executeInTransaction<T>(
        operation: (entityManager: EntityManager) => Promise<T>,
    ): Promise<T> {
        const entityManager = this.repository.getEntityManager();

        return entityManager.transactional(async (transactionManager) => {
            return operation(transactionManager);
        });
    }


    async updateBalance(
        entityManager: EntityManager,
        entity: WalletEntity,
        wallet: Wallet,
    ): Promise<void> {
        entity.balance = wallet.getBalance().toJSON().amount;
        entity.version = wallet.getVersion();
        entity.updatedAt = wallet.getUpdatedAt();

        await entityManager.flush();
    }

}
