import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateUserRootFolder } from "@/services/google-drive.service";
import { createTraceContext } from "@/types/drive";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

import { refreshAccessToken } from "@/lib/token-refresh";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        console.log("Mengecek user di Supabase untuk:", user.email);

        try {
          // 1. Cek apakah user sudah ada di database
          const { data: existingUser, error: checkError } = await supabase
            .from("users")
            .select("id, drive_folder_id")
            .eq("email", user.email)
            .single();

          if (checkError && checkError.code !== "PGRST116") {
            console.error("Error cek user:", checkError);
            return false;
          }

          // 2. Create or verify Drive root folder exists
          // This is idempotent — if folder exists, returns existing ID
          const accessToken = account.access_token;
          const userEmail = user.email || "";

          // Call Drive service to get or create user root folder
          const trace = createTraceContext(`signin_${userEmail}`);
          const noopRefresh = async () => null; // signIn has fresh token, no refresh needed
          const driveFolderId = accessToken
            ? await getOrCreateUserRootFolder(trace, accessToken, noopRefresh, userEmail)
            : null;

          // 3. Handle user record in database
          if (!existingUser) {
            // NEW USER: Insert with drive folder ID
            const { error: insertError } = await supabase
              .from("users")
              .insert({
                google_id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.image,
                drive_folder_id: driveFolderId,
              });

            if (insertError) {
              console.error(
                "Gagal menyimpan user ke Supabase:",
                insertError
              );
              return false;
            }

            console.log(
              "✅ User baru terdaftar dengan Drive folder ID:",
              driveFolderId
            );
          } else {
            // EXISTING USER: Update drive_folder_id if missing or changed
            if (
              driveFolderId &&
              existingUser.drive_folder_id !== driveFolderId
            ) {
              const { error: updateError } = await supabase
                .from("users")
                .update({ drive_folder_id: driveFolderId })
                .eq("id", existingUser.id);

              if (updateError) {
                console.error(
                  "Gagal update drive_folder_id:",
                  updateError
                );
              } else {
                console.log(
                  "✅ Drive folder ID diperbarui untuk user:",
                  user.email
                );
              }
            } else {
              console.log("User sudah terdaftar di database.");
            }
          }

          return true;
        } catch (error) {
          console.error("Terjadi kesalahan sistem:", error);
          return false;
        }
      }
      return false;
    },
    async jwt({ token, account }) {
      // Initial sign in — save tokens from Google OAuth response
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_in
          ? Date.now() + (account.expires_in as number) * 1000
          : undefined;
        console.log("[NextAuth JWT] Token stored:", {
          hasAccessToken: !!token.accessToken,
          hasRefreshToken: !!token.refreshToken,
          expiresIn: account.expires_in,
          expiresAt: token.accessTokenExpires
            ? new Date(token.accessTokenExpires).toISOString()
            : "unknown",
        });
        return token;
      }

      // Subsequent calls — check if token is still valid
      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires
      ) {
        console.log("[NextAuth JWT] Token still valid, reusing.");
        return token;
      }

      // Token expired or expiring — attempt refresh
      console.log("[NextAuth JWT] Token expired, attempting refresh...");
      const refreshedToken = await refreshAccessToken(token);

      // If refresh succeeded, use new token
      if (refreshedToken.accessToken) {
        console.log("[NextAuth JWT] Refresh successful.");
        return refreshedToken;
      }

      // If refresh failed but we still have a stale token, return it
      // so the API route can give a proper error message
      if (token.accessToken) {
        console.warn("[NextAuth JWT] Refresh FAILED, returning stale token.");
        return token;
      }

      // No token at all — return as-is
      return token;
    },
    async session({ session, token }) {
      const isExpired =
        token.accessTokenExpires
          ? Date.now() >= token.accessTokenExpires
          : false;

      console.log("[NextAuth Session] building session:", {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        isExpired,
        expiresAt: token.accessTokenExpires
          ? new Date(token.accessTokenExpires).toISOString()
          : "unknown",
      });

      return {
        ...session,
        accessToken: token.accessToken as string | undefined,
        refreshToken: token.refreshToken as string | undefined,
        accessTokenExpires: token.accessTokenExpires as number | undefined,
      };
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };