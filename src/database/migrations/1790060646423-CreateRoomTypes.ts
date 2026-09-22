import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoomTypes1790060646423 implements MigrationInterface {
  name = 'CreateRoomTypes1790060646423';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "amenities" ("id" BIGSERIAL NOT NULL, "code" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_cc57a712a97e0cc442a9fbdf2e8" UNIQUE ("code"), CONSTRAINT "PK_c0777308847b3556086f2fb233e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "room_types" ("id" BIGSERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text NOT NULL, "price_per_night" bigint NOT NULL, "total_rooms" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_20180102ff8f034e54c5812f695" UNIQUE ("name"), CONSTRAINT "room_types_total_rooms_check" CHECK (total_rooms >= 0), CONSTRAINT "PK_b6e1d0a9b67d4b9fbff9c35ab69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "room_type_amenities" ("id" BIGSERIAL NOT NULL, "room_type_id" bigint NOT NULL, "amenity_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "room_type_amenities_room_type_id_amenity_id_key" UNIQUE ("room_type_id", "amenity_id"), CONSTRAINT "PK_43569611937e1ec93ceba32c890" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c29e4ff2d3b4656a47ee2c5eb1" ON "room_type_amenities"  ("amenity_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "room_type_amenities" ADD CONSTRAINT "FK_71a73dd29d1f5790255c7f52b18" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_type_amenities" ADD CONSTRAINT "FK_c29e4ff2d3b4656a47ee2c5eb18" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room_type_amenities" DROP CONSTRAINT "FK_c29e4ff2d3b4656a47ee2c5eb18"`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_type_amenities" DROP CONSTRAINT "FK_71a73dd29d1f5790255c7f52b18"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c29e4ff2d3b4656a47ee2c5eb1"`,
    );
    await queryRunner.query(`DROP TABLE "room_type_amenities"`);
    await queryRunner.query(`DROP TABLE "room_types"`);
    await queryRunner.query(`DROP TABLE "amenities"`);
  }
}
