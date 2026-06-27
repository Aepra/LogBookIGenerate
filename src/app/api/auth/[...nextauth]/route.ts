import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      httpOptions: {
        timeout: 40000,
      },
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
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
            .select("id")
            .eq("email", user.email)
            .single();

          if (checkError && checkError.code !== "PGRST116") {
            console.error("Error cek user:", checkError);
            return false;
          }

          // 2. Handle user record in database
          if (!existingUser) {
            // NEW USER: Insert
            const { error: insertError } = await supabase
              .from("users")
              .insert({
                google_id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.image,
              });

            if (insertError) {
              console.error(
                "Gagal menyimpan user ke Supabase:",
                insertError
              );
              return false;
            }

            console.log("✅ User baru terdaftar:", user.email);
          } else {
            console.log("User sudah terdaftar di database.");
          }

          return true;
        } catch (error) {
          console.error("Terjadi kesalahan sistem:", error);
          return false;
        }
      }
      return false;
    },
    async jwt({ token }) {
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };