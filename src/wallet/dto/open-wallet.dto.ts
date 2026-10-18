import { IsNotEmpty, IsString, IsUUID, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InitialBalanceDto {
    @IsString()
    @Matches(/^(0|[1-9]\d*)\.\d{2}$/, {
        message: 'O valor deve ser uma string decimal com duas casas, como 1000.00.',
    })
    amount!: string;

    @IsString()
    @Matches(/^[A-Z]{3}$/, {
        message: 'A moeda deve conter exatamente três letras maiúsculas.',
    })
    currency!: string;
}

export class OpenWalletDto {
    @IsUUID('4', {
        message: 'O identificador do jogador deve ser um UUID válido.',
    })
    @IsNotEmpty({
        message: 'O identificador do jogador é obrigatório.',
    })
    playerId!: string;

    @IsNotEmpty({
        message: 'O saldo inicial é obrigatório.',
    })
    @ValidateNested()
    @Type(() => InitialBalanceDto)
    initialBalance!: InitialBalanceDto;
}
