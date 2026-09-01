-- Coffee Platform V1 — operations roles for owner, editors and verifiers
-- Editors create and edit drafts. Verifiers and administrators approve publication in the API.
begin;

do $$
declare
  v_signature regprocedure;
  v_definition text;
begin
  foreach v_signature in array array[
    'public.import_organization_intake_batch(uuid)'::regprocedure,
    'public.admin_create_catalog_draft(text,jsonb)'::regprocedure,
    'public.admin_create_brand_draft(jsonb)'::regprocedure
  ] loop
    select pg_get_functiondef(v_signature::oid) into v_definition;
    v_definition := replace(
      v_definition,
      'private.is_staff(ARRAY[''admin''::public.staff_role])',
      'private.is_staff()'
    );
    v_definition := replace(
      v_definition,
      'private.is_staff(array[''admin'']::public.staff_role[])',
      'private.is_staff()'
    );
    execute v_definition;
  end loop;
end $$;

comment on function public.import_organization_intake_batch(uuid) is
  'Converts validated intake rows into sourced drafts; editor, verifier, or admin.';
comment on function public.admin_create_catalog_draft(text,jsonb) is
  'Creates sourced catalog drafts; editor, verifier, or admin. Publication remains separately controlled.';
comment on function public.admin_create_brand_draft(jsonb) is
  'Creates sourced brand drafts; editor, verifier, or admin.';

commit;
