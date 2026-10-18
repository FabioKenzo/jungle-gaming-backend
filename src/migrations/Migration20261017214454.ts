
import { Migration } from '@mikro-orm/migrations';

export class Migration20261017214454 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
            create table "wallet_transactions" (
                "id" uuid not null,
                "wallet_id" uuid not null,
                "type" varchar(6) not null,
                "amount" numeric(20,2) not null,
                "balance_after" numeric(20,2) not null,
                "idempotency_key" varchar(100) not null,
                "created_at" timestamptz not null,

                constraint "wallet_transactions_pkey"
                    primary key ("id"),

                constraint "wallet_transactions_amount_check"
                    check (amount > 0),

                constraint "wallet_transactions_type_check"
                    check (type in ('CREDIT', 'DEBIT')),

                constraint "wallet_transactions_wallet_fk"
                    foreign key ("wallet_id")
                    references "wallets" ("id")
                    on delete restrict
            );
        `);

    this.addSql(`
            alter table "wallet_transactions"
            add constraint "wallet_transactions_idempotency_key_unique"
            unique ("idempotency_key");
        `);

    this.addSql(`
            create index "wallet_transactions_wallet_id_idx"
            on "wallet_transactions" ("wallet_id");
        `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wallet_transactions";`);
  }
}

