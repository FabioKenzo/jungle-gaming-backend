import {
    IsNotEmpty,
    IsString,
    Matches,
} from 'class-validator';

export class DebitWalletDto {
    @IsString({
        message: 'O valor deve ser uma string.',
    })
    @IsNotEmpty({
        message: 'O valor é obrigatório.',
    })
    @Matches(/^\d+(\.\d{1,2})?$/, {
        message: 'O valor deve ser positivo e possuir no máximo duas casas decimais.',
    })
    amount!: string;
}
