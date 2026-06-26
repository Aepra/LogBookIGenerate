/**
 * Token Refresh Utility
 * ======================
 * Refreshes an expired Google OAuth access token using the refresh_token.
 *
 * Used by:
 *   - NextAuth JWT callback (auto-refresh on page load)
 *   - Photo upload route (on-demand refresh when Drive returns 401)
 */

export async function refreshAccessToken(token: {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
}): Promise<{
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
}> {
  try {
    if (!token.refreshToken) {
      console.warn("[TOKEN_REFRESH] No refresh token available.");
      return { ...token, accessTokenExpires: undefined };
    }

    const url = new URL("https://oauth2.googleapis.com/token");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID as string);
    url.searchParams.set("client_secret", process.env.GOOGLE_CLIENT_SECRET as string);
    url.searchParams.set("grant_type", "refresh_token");
    url.searchParams.set("refresh_token", token.refreshToken);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const refreshedToken = await response.json();

    if (!response.ok) {
      console.error("[TOKEN_REFRESH] Google responded with error:", {
        status: response.status,
        body: refreshedToken,
      });
      if (refreshedToken?.error === "invalid_grant") {
        console.error("[TOKEN_REFRESH] invalid_grant — refresh token revoked or expired.");
        return { accessToken: undefined, refreshToken: undefined, accessTokenExpires: undefined };
      }
      return { ...token, accessTokenExpires: undefined };
    }

    console.log("[TOKEN_REFRESH] New token obtained.");
    return {
      accessToken: refreshedToken.access_token,
      refreshToken: refreshedToken.refresh_token ?? token.refreshToken,
      accessTokenExpires: refreshedToken.expires_in
        ? Date.now() + refreshedToken.expires_in * 1000
        : undefined,
    };
  } catch (error) {
    console.error("[TOKEN_REFRESH] Network error:", error);
    return { ...token, accessTokenExpires: undefined };
  }
}