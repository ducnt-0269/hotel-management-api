import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewDecisions1790589862685 implements MigrationInterface {
  name = 'CreateReviewDecisions1790589862685';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "review_rejections" ("id" BIGSERIAL NOT NULL, "review_id" bigint NOT NULL, "admin_user_id" bigint NOT NULL, "reason" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_1a90f30daf837bb929fbc493bd3" UNIQUE ("review_id"), CONSTRAINT "PK_4fa0cbaebf0eac6558a19bbfea8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_408d863d5db0c181121510c8aa" ON "review_rejections"  ("admin_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "review_approvals" ("id" BIGSERIAL NOT NULL, "review_id" bigint NOT NULL, "admin_user_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bdf468c79065afb528677300a49" UNIQUE ("review_id"), CONSTRAINT "PK_f97cbd0d2ac32b60e094d6a318b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74689279f03da0d593a12f4104" ON "review_approvals"  ("admin_user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "review_rejections" ADD CONSTRAINT "FK_1a90f30daf837bb929fbc493bd3" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_rejections" ADD CONSTRAINT "FK_408d863d5db0c181121510c8aae" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_approvals" ADD CONSTRAINT "FK_bdf468c79065afb528677300a49" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_approvals" ADD CONSTRAINT "FK_74689279f03da0d593a12f41046" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "review_approvals" DROP CONSTRAINT "FK_74689279f03da0d593a12f41046"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_approvals" DROP CONSTRAINT "FK_bdf468c79065afb528677300a49"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_rejections" DROP CONSTRAINT "FK_408d863d5db0c181121510c8aae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review_rejections" DROP CONSTRAINT "FK_1a90f30daf837bb929fbc493bd3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_74689279f03da0d593a12f4104"`,
    );
    await queryRunner.query(`DROP TABLE "review_approvals"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_408d863d5db0c181121510c8aa"`,
    );
    await queryRunner.query(`DROP TABLE "review_rejections"`);
  }
}
