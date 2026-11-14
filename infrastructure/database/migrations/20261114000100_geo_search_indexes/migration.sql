-- Extensions (idempotent; also created by the init migration)
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN CREATE EXTENSION IF NOT EXISTS postgis; END IF; END $$;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Proximity search: GiST index on the provider's geography point (matches the ST_DWithin expression in discovery).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE 'CREATE INDEX "ProviderProfile_geog_gist" ON "ProviderProfile" USING GIST ((ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography)) WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL';
  END IF;
END $$;

-- Fuzzy text search
CREATE INDEX "ProviderProfile_displayName_trgm" ON "ProviderProfile" USING GIN ("displayName" gin_trgm_ops);
CREATE INDEX "ProviderProfile_headline_trgm" ON "ProviderProfile" USING GIN ("headline" gin_trgm_ops);

-- One live subscription per provider
CREATE UNIQUE INDEX "Subscription_one_live_per_provider" ON "Subscription" ("providerId")
  WHERE "status" IN ('PENDING', 'ACTIVE', 'PAST_DUE');
