import { Migration } from '@mikro-orm/migrations';

export class Migration20261017233000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            ALTER TABLE wallet_transactions
            ADD COLUMN wallet_updated_at TIMESTAMPTZ NULL;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            ALTER TABLE wallet_transactions
            DROP COLUMN wallet_updated_at;
        `);
    }
}
