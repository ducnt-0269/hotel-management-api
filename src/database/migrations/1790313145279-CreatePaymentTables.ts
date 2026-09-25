import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTables1790313145279 implements MigrationInterface {
  name = 'CreatePaymentTables1790313145279';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_sessions" ("id" BIGSERIAL NOT NULL, "booking_request_id" bigint NOT NULL, "stripe_session_id" character varying(255) NOT NULL, "url" text NOT NULL, "amount" bigint NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'open', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bd7b91cddcb8f1f21ac88b3dc70" UNIQUE ("stripe_session_id"), CONSTRAINT "payment_sessions_status_check" CHECK (status IN ('open', 'completed', 'expired')), CONSTRAINT "payment_sessions_amount_check" CHECK (amount > 0), CONSTRAINT "PK_164d466559b8efd0968d7c2dc9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_50c16b76faf43f373857d516df" ON "payment_sessions"  ("booking_request_id") WHERE status = 'open'`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" BIGSERIAL NOT NULL, "payment_session_id" bigint NOT NULL, "booking_request_id" bigint NOT NULL, "amount" bigint NOT NULL, "paid_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bb5a2a6ff7a5a928ca80ce9ba33" UNIQUE ("payment_session_id"), CONSTRAINT "UQ_6e37e710cb0aac64da4ef0ffeac" UNIQUE ("booking_request_id"), CONSTRAINT "payments_amount_check" CHECK (amount > 0), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7848ab97e1ac9dddf781103de5" ON "payments"  ("paid_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_session_expirations" ("id" BIGSERIAL NOT NULL, "payment_session_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_986d9ff43c4bcaf0dea7e989d91" UNIQUE ("payment_session_id"), CONSTRAINT "PK_494ee7c1d76aef896d79f2cdf66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_sessions" ADD CONSTRAINT "FK_f0454350e2a0e012b8193adeebf" FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_bb5a2a6ff7a5a928ca80ce9ba33" FOREIGN KEY ("payment_session_id") REFERENCES "payment_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_6e37e710cb0aac64da4ef0ffeac" FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_session_expirations" ADD CONSTRAINT "FK_986d9ff43c4bcaf0dea7e989d91" FOREIGN KEY ("payment_session_id") REFERENCES "payment_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_session_expirations" DROP CONSTRAINT "FK_986d9ff43c4bcaf0dea7e989d91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_6e37e710cb0aac64da4ef0ffeac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_bb5a2a6ff7a5a928ca80ce9ba33"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_sessions" DROP CONSTRAINT "FK_f0454350e2a0e012b8193adeebf"`,
    );
    await queryRunner.query(`DROP TABLE "payment_session_expirations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7848ab97e1ac9dddf781103de5"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_50c16b76faf43f373857d516df"`,
    );
    await queryRunner.query(`DROP TABLE "payment_sessions"`);
  }
}
