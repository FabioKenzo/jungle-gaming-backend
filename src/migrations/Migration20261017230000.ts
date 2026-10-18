import { Migration } from '@mikro-orm/migrations';

export class Migration20261017230000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            ALTER TABLE wallet_transactions
            ADD COLUMN IF NOT EXISTS version_after INTEGER;
        `);

        this.addSql(`
            UPDATE wallet_transactions
            SET version_after = historical.version_number
            FROM (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY wallet_id
                        ORDER BY created_at, id
                    ) AS version_number
                FROM wallet_transactions
            ) AS historical
            WHERE wallet_transactions.id = historical.id
              AND wallet_transactions.version_after IS NULL;
        `);

        this.addSql(`
            ALTER TABLE wallet_transactions
            ALTER COLUMN version_after SET NOT NULL;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            ALTER TABLE wallet_transactions
            DROP COLUMN IF EXISTS version_after;
        `);
    }
}
