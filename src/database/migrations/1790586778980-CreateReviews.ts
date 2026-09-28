import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviews1790586778980 implements MigrationInterface {
  name = 'CreateReviews1790586778980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" BIGSERIAL NOT NULL, "booking_request_id" bigint NOT NULL, "rating" smallint NOT NULL, "comment" text NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f003105c94fe84e6c430381c025" UNIQUE ("booking_request_id"), CONSTRAINT "reviews_status_check" CHECK (status IN ('pending', 'approved', 'rejected')), CONSTRAINT "reviews_rating_check" CHECK (rating BETWEEN 1 AND 5), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e1d5276a67060738d6d45c846" ON "reviews"  ("status") WHERE status = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_f003105c94fe84e6c430381c025" FOREIGN KEY ("booking_request_id") REFERENCES "booking_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_f003105c94fe84e6c430381c025"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9e1d5276a67060738d6d45c846"`,
    );
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
