import { Body, Controller, HttpCode, HttpStatus, Post, } from '@nestjs/common';
import { WageringService, type ProcessWageringInput, } from './wagering.service';

@Controller('wagering')
export class WageringController {
    constructor(
        private readonly wageringService: WageringService,
    ) {}

    @Post('bet')
    @HttpCode(HttpStatus.OK)
    async bet(@Body() input: ProcessWageringInput) {
        return this.wageringService.bet(input);
    }

    @Post('win')
    @HttpCode(HttpStatus.OK)
    async win(@Body() input: ProcessWageringInput) {
        return this.wageringService.win(input);
    }

    @Post('loss')
    @HttpCode(HttpStatus.OK)
    async loss(@Body() input: ProcessWageringInput) {
        return this.wageringService.loss(input);
    }

    @Post('refund')
    @HttpCode(HttpStatus.OK)
    async refund(@Body() input: ProcessWageringInput) {
        return this.wageringService.refund(input);
    }

    @Post('rollback')
    @HttpCode(HttpStatus.OK)
    async rollback(@Body() input: ProcessWageringInput) {
        return this.wageringService.rollback(input);
    }
}


