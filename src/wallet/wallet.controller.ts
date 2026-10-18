import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post,} from '@nestjs/common';

import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { OpenWalletDto } from './dto/open-wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallets')
export class WalletController {
    constructor(
        private readonly walletService: WalletService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async openWallet(@Body() body: OpenWalletDto) {
        const wallet = await this.walletService.openWallet(
            body.playerId,
            body.initialBalance,
        );

        return {
            id: wallet.id,
            playerId: wallet.playerId,
            currency: wallet.currency,
            balance: wallet.getBalance().toJSON(),
            version: wallet.getVersion(),
            createdAt: wallet.createdAt,
            updatedAt: wallet.getUpdatedAt(),
        };
    }

    @Get(':playerId/:currency')
    async getWallet(
        @Param('playerId', new ParseUUIDPipe({ version: '4' }))
        playerId: string,

        @Param('currency')
        currency: string,
    ) {
        const wallet = await this.walletService.getWallet(
            playerId,
            currency,
        );

        return {
            id: wallet.id,
            playerId: wallet.playerId,
            currency: wallet.currency,
            balance: wallet.getBalance().toJSON(),
            version: wallet.getVersion(),
            createdAt: wallet.createdAt,
            updatedAt: wallet.getUpdatedAt(),
        };
    }

    @Post(':playerId/:currency/credit')
    @HttpCode(HttpStatus.OK)
    async credit(
        @Param('playerId', new ParseUUIDPipe({ version: '4' }))
        playerId: string,

        @Param('currency')
        currency: string,

        @Body()
        body: CreditWalletDto,

        @Headers('idempotency-key')
        idempotencyKey: string,
    ) {
        const wallet = await this.walletService.credit(
            playerId,
            currency,
            body.amount,
            idempotencyKey,
        );

        return {
            id: wallet.id,
            playerId: wallet.playerId,
            currency: wallet.currency,
            balance: wallet.getBalance().toJSON(),
            version: wallet.getVersion(),
            createdAt: wallet.createdAt,
            updatedAt: wallet.getUpdatedAt(),
        };
    }

    @Post(':playerId/:currency/debit')
    @HttpCode(HttpStatus.OK)
    async debit(
        @Param('playerId', new ParseUUIDPipe({ version: '4' }))
        playerId: string,

        @Param('currency')
        currency: string,

        @Body()
        body: DebitWalletDto,

        @Headers('idempotency-key')
        idempotencyKey: string,
    ) {
        const wallet = await this.walletService.debit(
            playerId,
            currency,
            body.amount,
            idempotencyKey,
        );

        return {
            id: wallet.id,
            playerId: wallet.playerId,
            currency: wallet.currency,
            balance: wallet.getBalance().toJSON(),
            version: wallet.getVersion(),
            createdAt: wallet.createdAt,
            updatedAt: wallet.getUpdatedAt(),
        };
    }
}

