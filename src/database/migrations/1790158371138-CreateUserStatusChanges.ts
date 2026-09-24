import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserStatusChanges1790158371138 implements MigrationInterface {
  name = 'CreateUserStatusChanges1790158371138';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_deactivations" ("id" BIGSERIAL NOT NULL, "user_id" bigint NOT NULL, "admin_user_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b4d0e6d619787c280de4270356f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2734a867ff10a787d8f2dcfde9" ON "user_deactivations"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_reactivations" ("id" BIGSERIAL NOT NULL, "user_id" bigint NOT NULL, "admin_user_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bb8575e4830c5daf56c97aa72bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eb54caa1e379aca0b89fd74044" ON "user_reactivations"  ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_deactivations" ADD CONSTRAINT "FK_2734a867ff10a787d8f2dcfde98" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_deactivations" ADD CONSTRAINT "FK_67e1c72bae7d15e8b5f443fc3d2" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_reactivations" ADD CONSTRAINT "FK_eb54caa1e379aca0b89fd740440" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_reactivations" ADD CONSTRAINT "FK_0a04e6bdf32a51581623d8cd6c1" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_reactivations" DROP CONSTRAINT "FK_0a04e6bdf32a51581623d8cd6c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_reactivations" DROP CONSTRAINT "FK_eb54caa1e379aca0b89fd740440"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_deactivations" DROP CONSTRAINT "FK_67e1c72bae7d15e8b5f443fc3d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_deactivations" DROP CONSTRAINT "FK_2734a867ff10a787d8f2dcfde98"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eb54caa1e379aca0b89fd74044"`,
    );
    await queryRunner.query(`DROP TABLE "user_reactivations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2734a867ff10a787d8f2dcfde9"`,
    );
    await queryRunner.query(`DROP TABLE "user_deactivations"`);
  }
}
