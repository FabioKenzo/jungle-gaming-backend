import { Migration } from '@mikro-orm/migrations';

export class Migration20261018000200 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            CREATE TABLE "wagering_transactions" (
                "id" uuid NOT NULL,
                "wallet_id" uuid NOT NULL,
                "player_id" uuid NOT NULL,
                "currency" varchar(3) NOT NULL,
                "type" varchar(10) NOT NULL,
                "status" varchar(20) NOT NULL,
                "amount" numeric(20,2) NOT NULL,
                "created_at" timestamptz NOT NULL,
                "provider_id" varchar(100) NULL,
                "external_transaction_id" varchar(150) NULL,
                "idempotency_key" varchar(200) NOT NULL,
                "payload_hash" varchar(64) NULL,
                "round_id" varchar(150) NULL,
                "game_id" varchar(150) NULL,
                "reference_external_transaction_id" varchar(150) NULL,
                "reference_transaction_id" uuid NULL,
                "failure_code" varchar(100) NULL,
                "processed_at" timestamptz NULL,
                CONSTRAINT "wagering_transactions_pkey"
                    PRIMARY KEY ("id"),
                CONSTRAINT "wagering_transactions_idempotency_key_unique"
                    UNIQUE ("idempotency_key"),
                CONSTRAINT "wagering_transactions_amount_check"
                    CHECK ("amount" > 0)
            );
        `);

        this.addSql(`
            ALTER TABLE "wallet_transactions"
            ADD COLUMN "transaction_id" uuid NULL;
        `);

        this.addSql(`
            ALTER TABLE "wallet_transactions"
            ADD CONSTRAINT "wallet_transactions_transaction_fk"
            FOREIGN KEY ("transaction_id")
            REFERENCES "wagering_transactions" ("id");
        `);

        this.addSql(`
            CREATE UNIQUE INDEX "wallet_transactions_transaction_id_unique"
            ON "wallet_transactions" ("transaction_id")
            WHERE "transaction_id" IS NOT NULL;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            DROP INDEX IF EXISTS
            "wallet_transactions_transaction_id_unique";
        `);

        this.addSql(`
            ALTER TABLE "wallet_transactions"
            DROP CONSTRAINT IF EXISTS
            "wallet_transactions_transaction_fk";
        `);

        this.addSql(`
            ALTER TABLE "wallet_transactions"
            DROP COLUMN "transaction_id";
        `);

        this.addSql(`
            DROP TABLE "wagering_transactions";
        `);
    }
}
