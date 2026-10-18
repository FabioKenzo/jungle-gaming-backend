import { Migration } from '@mikro-orm/migrations';

export class Migration20261018000100 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            ALTER TABLE wallets
            ALTER COLUMN version SET DEFAULT 1;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            ALTER TABLE wallets
            ALTER COLUMN version SET DEFAULT 0;
        `);
    }
}
