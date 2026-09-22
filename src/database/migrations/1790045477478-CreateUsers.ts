import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1790045477478 implements MigrationInterface {
  name = 'CreateUsers1790045477478';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "full_name" character varying(100) NOT NULL, "role" character varying(10) NOT NULL, "status" character varying(12) NOT NULL DEFAULT 'unverified', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "users_status_check" CHECK (status IN ('unverified', 'active', 'deactivated')), CONSTRAINT "users_role_check" CHECK (role IN ('user', 'admin')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "users"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_email_verification_tokens" ("id" BIGSERIAL NOT NULL, "user_id" bigint NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_dbbbadae78bfb64a9f74161beba" UNIQUE ("user_id"), CONSTRAINT "PK_cd4609947400415dfcfd6321d20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_email_verifications" ("id" BIGSERIAL NOT NULL, "user_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_032b8b38e95b5fdb441fb16d004" UNIQUE ("user_id"), CONSTRAINT "PK_6f8c4d3c47a5bdff33f6009477d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_email_verification_tokens" ADD CONSTRAINT "FK_dbbbadae78bfb64a9f74161beba" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_email_verifications" ADD CONSTRAINT "FK_032b8b38e95b5fdb441fb16d004" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_email_verifications" DROP CONSTRAINT "FK_032b8b38e95b5fdb441fb16d004"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_email_verification_tokens" DROP CONSTRAINT "FK_dbbbadae78bfb64a9f74161beba"`,
    );
    await queryRunner.query(`DROP TABLE "user_email_verifications"`);
    await queryRunner.query(`DROP TABLE "user_email_verification_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3676155292d72c67cd4e090514"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
