import { Body, Controller, HttpCode, HttpStatus, Post, } from '@nestjs/common';

import { WageringService, type ProcessWageringInput, } from './wagering.service';

@Controller('wagering')
export class WageringController {
    constructor(
        private readonly wageringService: WageringService,
    ) {}

    @Post('bet')
    @HttpCode(HttpStatus.OK)
    async bet(@Body() body: ProcessWageringInput) {
        return this.wageringService.bet(body);
    }

    @Post('win')
    @HttpCode(HttpStatus.OK)
    async win(@Body() body: ProcessWageringInput) {
        return this.wageringService.win(body);
    }
}

