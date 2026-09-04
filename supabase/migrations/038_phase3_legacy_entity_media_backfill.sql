BEGIN;

-- Migration 038: Non-destructive bridge from legacy entity_media to asset-centric media.
-- Source rows and Storage objects are never deleted or updated.

DO $$
DECLARE
  v_source_count integer;
  v_target_count integer;
  v_missing_profiles integer;
  v_missing_objects integer;
  v_invalid_entities integer;
BEGIN
  SELECT count(*) INTO v_source_count FROM public.entity_media;
  IF v_source_count <> 9 THEN RAISE EXCEPTION 'phase3_backfill_expected_9_legacy_rows_got_%', v_source_count; END IF;
  SELECT count(*) INTO v_target_count FROM public.media_assets;
  IF v_target_count <> 0 THEN RAISE EXCEPTION 'phase3_backfill_requires_empty_media_assets_got_%', v_target_count; END IF;

  SELECT count(*) INTO v_invalid_entities
  FROM public.entity_media em
  WHERE em.entity_table NOT IN ('products','offers','organizations','brands')
     OR NOT private.media_target_exists(em.entity_table, em.entity_id);
  IF v_invalid_entities <> 0 THEN RAISE EXCEPTION 'phase3_backfill_invalid_entity_targets_%', v_invalid_entities; END IF;

  SELECT count(*) INTO v_missing_profiles
  FROM public.entity_media em
  LEFT JOIN public.profiles p ON p.id = em.created_by
  WHERE em.created_by IS NULL OR p.id IS NULL;
  IF v_missing_profiles <> 0 THEN RAISE EXCEPTION 'phase3_backfill_missing_uploader_profiles_%', v_missing_profiles; END IF;

  SELECT count(*) INTO v_missing_objects
  FROM public.entity_media em
  LEFT JOIN storage.objects so ON so.bucket_id='public-media' AND so.name=em.storage_path
  WHERE so.id IS NULL;
  IF v_missing_objects <> 0 THEN RAISE EXCEPTION 'phase3_backfill_missing_storage_objects_%', v_missing_objects; END IF;
END $$;

INSERT INTO public.media_assets (
  id, purpose, original_storage_path, sanitized_storage_path, published_storage_path,
  original_filename, declared_mime, detected_mime, byte_size, width, height,
  page_count, sha256_hex, duplicate_of_asset_id, technical_status,
  publication_status, rejection_codes, technical_report, legal_hold, uploaded_by,
  validated_at, approved_by, approved_at, published_at, restricted_at, created_at, updated_at
)
SELECT
  em.id,
  CASE em.entity_table
    WHEN 'products' THEN 'master_product'
    WHEN 'offers' THEN 'vendor_offer'
    WHEN 'organizations' THEN 'organization_profile'
    WHEN 'brands' THEN 'brand_identity'
  END,
  em.storage_path,
  NULL,
  NULL,
  regexp_replace(em.storage_path, '^.*/', ''),
  lower(coalesce(so.metadata->>'mimetype', 'application/octet-stream')),
  NULL,
  NULLIF(so.metadata->>'size','')::bigint,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'validating',
  'private',
  '{}',
  jsonb_build_object(
    'migration', '038_phase3_legacy_entity_media_backfill',
    'legacy_source_table', 'entity_media',
    'legacy_source_id', em.id,
    'legacy_storage_bucket', 'public-media',
    'legacy_storage_path', em.storage_path,
    'legacy_public_url', em.url,
    'legacy_media_type', em.media_type,
    'legacy_rights_note', em.rights_note,
    'legacy_source_record_id', em.source_record_id,
    'storage_metadata_mime', so.metadata->>'mimetype',
    'storage_metadata_size', so.metadata->>'size',
    'technical_validation_required', true,
    'checksum_status', 'not_computable_from_postgres_storage_metadata',
    'dimension_status', 'not_available_in_storage_metadata',
    'preservation_policy', 'legacy_source_and_storage_object_untouched'
  ),
  false,
  em.created_by,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  em.created_at,
  now()
FROM public.entity_media em
JOIN storage.objects so ON so.bucket_id='public-media' AND so.name=em.storage_path;

INSERT INTO public.media_asset_links (
  id, asset_id, entity_type, entity_id, role, is_primary, sort_order,
  alt_ar, alt_en, caption_ar, caption_en, link_status, linked_by, linked_at, updated_at
)
SELECT
  gen_random_uuid(), em.id, em.entity_table, em.entity_id,
  CASE WHEN em.is_primary THEN 'primary' ELSE 'gallery' END,
  em.is_primary, greatest(em.sort_order,0), left(trim(em.alt_ar),2000), NULL, NULL, NULL,
  'active', em.created_by, em.created_at, now()
FROM public.entity_media em;

DO $$
DECLARE
  v_assets integer;
  v_links integer;
  v_orphan_assets integer;
  v_missing_storage integer;
  v_missing_entity_links integer;
  v_source_count integer;
  v_primary_collisions integer;
  v_source_storage integer;
  v_asset_storage integer;
BEGIN
  SELECT count(*) INTO v_assets FROM public.media_assets;
  SELECT count(*) INTO v_links FROM public.media_asset_links;
  SELECT count(*) INTO v_source_count FROM public.entity_media;
  IF v_assets <> 9 THEN RAISE EXCEPTION 'phase3_backfill_assets_expected_9_got_%', v_assets; END IF;
  IF v_links <> 9 THEN RAISE EXCEPTION 'phase3_backfill_links_expected_9_got_%', v_links; END IF;
  IF v_source_count <> 9 THEN RAISE EXCEPTION 'phase3_backfill_source_changed_expected_9_got_%', v_source_count; END IF;

  SELECT count(*) INTO v_orphan_assets
  FROM public.media_assets a LEFT JOIN public.media_asset_links l ON l.asset_id=a.id WHERE l.id IS NULL;
  IF v_orphan_assets <> 0 THEN RAISE EXCEPTION 'phase3_backfill_orphan_assets_%', v_orphan_assets; END IF;

  SELECT count(*) INTO v_missing_storage
  FROM public.media_assets a LEFT JOIN storage.objects so ON so.bucket_id='public-media' AND so.name=a.original_storage_path
  WHERE so.id IS NULL;
  IF v_missing_storage <> 0 THEN RAISE EXCEPTION 'phase3_backfill_storage_reconciliation_missing_%', v_missing_storage; END IF;

  SELECT count(*) INTO v_missing_entity_links
  FROM public.entity_media em LEFT JOIN public.media_asset_links l
    ON l.asset_id=em.id AND l.entity_type=em.entity_table AND l.entity_id=em.entity_id
  WHERE l.id IS NULL;
  IF v_missing_entity_links <> 0 THEN RAISE EXCEPTION 'phase3_backfill_link_integrity_missing_%', v_missing_entity_links; END IF;

  SELECT count(*) INTO v_primary_collisions
  FROM (SELECT entity_type,entity_id,role FROM public.media_asset_links WHERE is_primary AND link_status IN ('pending','active') GROUP BY 1,2,3 HAVING count(*)>1) q;
  IF v_primary_collisions <> 0 THEN RAISE EXCEPTION 'phase3_backfill_primary_link_collisions_%', v_primary_collisions; END IF;

  SELECT count(*) INTO v_source_storage FROM public.entity_media em JOIN storage.objects so ON so.bucket_id='public-media' AND so.name=em.storage_path;
  SELECT count(*) INTO v_asset_storage FROM public.media_assets a JOIN storage.objects so ON so.bucket_id='public-media' AND so.name=a.original_storage_path;
  IF v_source_storage <> 9 OR v_asset_storage <> 9 THEN RAISE EXCEPTION 'phase3_backfill_storage_counts_source_%_assets_%',v_source_storage,v_asset_storage; END IF;
END $$;

COMMIT;