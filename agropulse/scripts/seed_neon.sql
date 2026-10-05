-- AgroPulse Africa — Seed Neon (copier-coller dans Neon Dashboard → SQL Editor → Run)
-- Idempotent : ne fait rien si la table countries contient deja des lignes.
-- Tables creees si absentes (modele : voir 08_Base_de_Donnees).

CREATE TABLE IF NOT EXISTS countries (
 id UUID PRIMARY KEY, code VARCHAR(3) NOT NULL UNIQUE,
 name_fr VARCHAR(100) NOT NULL, currency VARCHAR(3) DEFAULT 'XOF',
 created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS regions (
 id UUID PRIMARY KEY, country_id UUID NOT NULL REFERENCES countries(id),
 code VARCHAR(10) NOT NULL, name_fr VARCHAR(100) NOT NULL, name_local VARCHAR(100));
CREATE TABLE IF NOT EXISTS markets (
 id UUID PRIMARY KEY, region_id UUID NOT NULL REFERENCES regions(id),
 name_fr VARCHAR(150) NOT NULL, name_local VARCHAR(150),
 market_type VARCHAR(20) DEFAULT 'wholesale',
 lat NUMERIC(9,5), lng NUMERIC(9,5),
 is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS products (
 id UUID PRIMARY KEY, code VARCHAR(20) NOT NULL UNIQUE,
 name_fr VARCHAR(100) NOT NULL, name_local VARCHAR(100),
 unit VARCHAR(20) DEFAULT 'kg', is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS price_records (
 id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES products(id),
 market_id UUID NOT NULL REFERENCES markets(id),
 price DECIMAL(12,2) NOT NULL, currency VARCHAR(3) DEFAULT 'XOF',
 unit VARCHAR(20) DEFAULT 'kg', volume_estimate DECIMAL(12,2),
 source_type VARCHAR(20) NOT NULL, source_id UUID, photo_url VARCHAR(500),
 status VARCHAR(20) DEFAULT 'pending', recorded_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ DEFAULT NOW());

DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM countries) THEN
  RAISE NOTICE 'Seed deja present — rien a faire.';
 ELSE
  INSERT INTO countries (id, code, name_fr) VALUES
   ('897802bb-397f-4568-958b-7f231bef3bb0','TGO','Togo');

  INSERT INTO regions (id, country_id, code, name_fr) VALUES
   ('a53d8ed4-b34f-4269-8cc0-b64c018003c1','897802bb-397f-4568-958b-7f231bef3bb0','MAR','Maritime'),
   ('3fa54169-d036-4341-8ec9-6f1b0dc0d7b2','897802bb-397f-4568-958b-7f231bef3bb0','PLA','Plateaux'),
   ('468d29ce-6730-41b4-ac77-ce4d0c9f722d','897802bb-397f-4568-958b-7f231bef3bb0','CEN','Centrale'),
   ('be0c15dc-fe54-4e36-bceb-32cd087e5b75','897802bb-397f-4568-958b-7f231bef3bb0','KAR','Kara'),
   ('577a82d2-4caa-4f4f-add1-ed315ca62668','897802bb-397f-4568-958b-7f231bef3bb0','SAV','Savanes');

  INSERT INTO markets (id, region_id, name_fr, market_type) VALUES
   ('d65de89d-6140-4f93-81bd-797ff34f74b7','a53d8ed4-b34f-4269-8cc0-b64c018003c1','Hedzranawoe (Lome)','wholesale'),
   ('958dea30-22d3-4be5-a96c-4e7853b569ee','a53d8ed4-b34f-4269-8cc0-b64c018003c1','Tabligbo','retail'),
   ('50ad29ad-1062-407f-b087-c07598a17e3d','a53d8ed4-b34f-4269-8cc0-b64c018003c1','Aneho','retail'),
   ('a2e08fe2-557a-4a45-bf8a-18f072639cf0','3fa54169-d036-4341-8ec9-6f1b0dc0d7b2','Atakpame','wholesale'),
   ('70f884f2-18b1-43f3-bdba-9389d7d791d1','3fa54169-d036-4341-8ec9-6f1b0dc0d7b2','Kpalime','retail'),
   ('babc0fb0-4094-4006-98ee-5cc1d525dfb8','3fa54169-d036-4341-8ec9-6f1b0dc0d7b2','Badou','retail'),
   ('da806bde-806f-42c7-bc21-127ee03055a8','468d29ce-6730-41b4-ac77-ce4d0c9f722d','Sokode','wholesale'),
   ('0eec674c-0cc4-431a-ba51-3cd2e9e32465','468d29ce-6730-41b4-ac77-ce4d0c9f722d','Tchamba','retail'),
   ('0196ded2-bdca-474a-a82f-3c9b429d01f4','468d29ce-6730-41b4-ac77-ce4d0c9f722d','Sotouboua','retail'),
   ('9b1ffe38-d5ea-494e-b787-787957f5f795','be0c15dc-fe54-4e36-bceb-32cd087e5b75','Kara','wholesale'),
   ('274835da-75fb-490b-a677-4d2437e5b74c','be0c15dc-fe54-4e36-bceb-32cd087e5b75','Bassar','retail'),
   ('99b372af-6d0c-4631-bb9e-8ec60a58c849','be0c15dc-fe54-4e36-bceb-32cd087e5b75','Niamtougou','retail'),
   ('07274022-9bce-4f49-a0df-6f6ab81a324a','577a82d2-4caa-4f4f-add1-ed315ca62668','Dapaong','wholesale'),
   ('117f709c-d7a2-4960-988b-374d2aa1916c','577a82d2-4caa-4f4f-add1-ed315ca62668','Cinkasse','border');

  INSERT INTO products (id, code, name_fr) VALUES
   ('2a5bd8c7-4a64-4a33-a2b1-160016f1f737','MAIS','Mais'),
   ('17f70599-e35a-469d-b5f8-24a6f9cbeda0','SOJA','Soja'),
   ('2e8e7daa-96b1-4e86-854b-dd37bc36febb','TOMATE','Tomate'),
   ('5efa7dca-b111-4a68-a273-718d9e36029d','MANIOC','Manioc'),
   ('7599521e-32ac-435c-8e93-4330f9e21151','IGNAME','Igname'),
   ('dbf88e28-1122-437d-add6-208b8e155a4a','ARACHIDE','Arachide'),
   ('55671ade-c866-4a97-a1b9-1fa9c9ab6414','CACAO','Cacao'),
   ('a3c81575-85b3-452e-a50a-e70cfc6f51fa','CAFE','Cafe'),
   ('2255ce46-a090-44c0-a1a2-75f60d72905b','RIZ','Riz');

  INSERT INTO price_records (id, product_id, market_id, price, volume_estimate, source_type, status, recorded_at) VALUES
   ('98d1c32d-3713-4d25-a127-6b04925fa7cc','2a5bd8c7-4a64-4a33-a2b1-160016f1f737','d65de89d-6140-4f93-81bd-797ff34f74b7',225,500,'agent','approved',NOW()),
   ('3ae38ea3-f185-4a98-864e-c9bb64989e3d','17f70599-e35a-469d-b5f8-24a6f9cbeda0','d65de89d-6140-4f93-81bd-797ff34f74b7',380,400,'agent','approved',NOW()),
   ('60298f0f-5a14-4086-ba8c-d822af08cf05','2e8e7daa-96b1-4e86-854b-dd37bc36febb','d65de89d-6140-4f93-81bd-797ff34f74b7',450,300,'agent','approved',NOW()),
   ('3480db9e-a597-4de2-a679-d4a1afd38272','2a5bd8c7-4a64-4a33-a2b1-160016f1f737','9b1ffe38-d5ea-494e-b787-787957f5f795',210,600,'agent','approved',NOW());

  RAISE NOTICE 'Seed OK : 1 pays, 5 regions, 14 marches, 9 produits, 4 prix.';
 END IF;
END $$;
