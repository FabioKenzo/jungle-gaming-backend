import {IsNotEmpty, IsString, IsUUID, Matches} from 'class-validator';

export class OpenWalletDto {
    @IsUUID('4', {
        message: 'O identificador do jogador deve ser um UUID válido.',
    })
    @IsNotEmpty({
        message: 'O identificador do jogador é obrigatório.',
    })
    playerId!: string;

    @IsString({
        message: 'A moeda deve ser uma string.',
    })
    @Matches(/^[A-Z]{3}$/, {
        message: 'A moeda deve conter exatamente três letras maiúsculas.',
    })
    @IsNotEmpty({
        message: 'A moeda é obrigatória.',
    })
    currency!: string;
}
