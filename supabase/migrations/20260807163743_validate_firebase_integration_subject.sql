-- The Edge Function's legacy gateway verifier cannot validate Firebase's
-- asymmetric JWTs. This narrow Data API RPC lets PostgREST perform the
-- configured third-party authentication and returns only the authenticated
-- token subject. It neither reads application data nor bypasses RLS.
create or replace function public.get_authenticated_firebase_subject()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(auth.jwt()->>'sub', '')
  where auth.jwt()->>'role' = 'authenticated'
    and auth.jwt()->>'iss' = 'https://securetoken.google.com/gen-lang-client-0173546340'
    and auth.jwt()->>'aud' = 'gen-lang-client-0173546340';
$$;

revoke all on function public.get_authenticated_firebase_subject() from public, anon;
grant execute on function public.get_authenticated_firebase_subject() to authenticated;
