import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingRequestDecisions1790230283696 implements MigrationInterface {
  name = 'CreateBookingRequestDecisions1790230283696';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "booking_request_rejections" ("id" BIGSERIAL NOT NULL, "booking_request_id" bigint NOT NULL, "admin_user_id" bigint NOT NULL, "reason" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_62ec1ddb26fbf18290c3ea4c2fe" UNIQUE ("booking_request_id"), CONSTRAINT "PK_8207cc0cf6a84cae8686c47169b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_48e3c04f7060da0df859784609" ON "booking_request_rejections"  ("admin_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_request_approvals" ("id" BIGSERIAL NOT NULL, "booking_request_id" bigint NOT NULL, "admin_user_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe589d59d74b912b773e4c46b1f" UNIQUE ("booking_request_id"), CONSTRAINT "PK_f6708b5f0ea572ba7706d4936e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5b9a7030e880545c87c6fdd76b" ON "booking_request_approvals"  ("admin_user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_rejections" ADD CONSTRAINT "FK_62ec1ddb26fbf18290c3ea4c2fe" FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_rejections" ADD CONSTRAINT "FK_48e3c04f7060da0df859784609b" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_approvals" ADD CONSTRAINT "FK_fe589d59d74b912b773e4c46b1f" FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_approvals" ADD CONSTRAINT "FK_5b9a7030e880545c87c6fdd76be" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_request_approvals" DROP CONSTRAINT "FK_5b9a7030e880545c87c6fdd76be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_approvals" DROP CONSTRAINT "FK_fe589d59d74b912b773e4c46b1f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_rejections" DROP CONSTRAINT "FK_48e3c04f7060da0df859784609b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_rejections" DROP CONSTRAINT "FK_62ec1ddb26fbf18290c3ea4c2fe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5b9a7030e880545c87c6fdd76b"`,
    );
    await queryRunner.query(`DROP TABLE "booking_request_approvals"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_48e3c04f7060da0df859784609"`,
    );
    await queryRunner.query(`DROP TABLE "booking_request_rejections"`);
  }
}
