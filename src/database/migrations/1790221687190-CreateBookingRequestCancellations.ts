import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingRequestCancellations1790221687190 implements MigrationInterface {
  name = 'CreateBookingRequestCancellations1790221687190';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "booking_request_cancellations" ("id" BIGSERIAL NOT NULL, "booking_request_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_025d961c08d2c17e1b8797888c0" UNIQUE ("booking_request_id"), CONSTRAINT "PK_88fdf795284adef01abd2b74b75" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_request_cancellations" ADD CONSTRAINT "FK_025d961c08d2c17e1b8797888c0" FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_request_cancellations" DROP CONSTRAINT "FK_025d961c08d2c17e1b8797888c0"`,
    );
    await queryRunner.query(`DROP TABLE "booking_request_cancellations"`);
  }
}
