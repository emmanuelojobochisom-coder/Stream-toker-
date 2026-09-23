# Stream Toker — V3 Connected Foundation

This build is wired for a real Supabase project using the current Expo/React Native setup.

## What is connected in the code
- Supabase Auth session persistence
- Supabase database client
- Database schema + Row Level Security policies
- Realtime-ready client
- Storage-ready architecture
- Environment-based configuration (no secrets committed)

## One required external setup
A real Supabase project must exist before the app can connect to production data. Supabase's official Expo guide says to create a project, run the SQL schema, then put the Project URL and Publishable key in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

1. Create/open the Stream Toker Supabase project.
2. In its SQL Editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env`.
4. Replace the two placeholder values with the project's URL and Publishable key.
5. Run `npm install` and `npx expo start`.

Do not put service-role keys, passwords, OTPs, or bank information in the mobile app or source code.

The next build will add real sign-up/login UI, profile creation, video upload to Supabase Storage, and realtime chat subscriptions.
