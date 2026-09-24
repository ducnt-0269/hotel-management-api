import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingRequests1790131444585 implements MigrationInterface {
  name = 'CreateBookingRequests1790131444585';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "booking_requests" ("id" BIGSERIAL NOT NULL, "user_id" bigint NOT NULL, "room_type_id" bigint NOT NULL, "rooms_requested" integer NOT NULL, "check_in_date" date NOT NULL, "check_out_date" date NOT NULL, "total_amount" bigint NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "booking_requests_status_check" CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')), CONSTRAINT "booking_requests_stay_check" CHECK (check_out_date > check_in_date), CONSTRAINT "booking_requests_rooms_requested_check" CHECK (rooms_requested > 0), CONSTRAINT "PK_62c29ee249979fe0bcdcde33dae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_381339716814cfa06c16a2a84b" ON "booking_requests"  ("room_type_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_64918c0ec8e5254d2b715643f2" ON "booking_requests"  ("expires_at") WHERE status = 'pending'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d0d911a3e5818254d1af216e6" ON "booking_requests"  ("room_type_id", "check_in_date", "check_out_date") WHERE status IN ('pending', 'approved')`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_322319ecbe7c48e2abd5e9d278" ON "booking_requests"  ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_request_expirations" ("id" BIGSERIAL NOT NULL, "booking_request_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0c4629a873dc8343bdb0849f977" UNIQUE ("booking_request_id"), CONSTRAINT "PK_1d48f3639b8eea2d35cc8ec5e75" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_requests" ADD CONSTRAINT "FK_7a2be6885ce0291edbd1018ca80" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_requests" ADD CONSTRAINT "FK_381339716814cfa06c16a2a84b4" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_expirations" ADD CONSTRAINT "FK_0c4629a873dc8343bdb0849f977" FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_request_expirations" DROP CONSTRAINT "FK_0c4629a873dc8343bdb0849f977"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_requests" DROP CONSTRAINT "FK_381339716814cfa06c16a2a84b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_requests" DROP CONSTRAINT "FK_7a2be6885ce0291edbd1018ca80"`,
    );
    await queryRunner.query(`DROP TABLE "booking_request_expirations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_322319ecbe7c48e2abd5e9d278"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d0d911a3e5818254d1af216e6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_64918c0ec8e5254d2b715643f2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_381339716814cfa06c16a2a84b"`,
    );
    await queryRunner.query(`DROP TABLE "booking_requests"`);
  }
}
