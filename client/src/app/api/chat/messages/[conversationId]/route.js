// Helper function to extract token from cookies
function getTokenFromCookies(cookieHeader) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});

  return {
    refreshToken: cookies.refreshToken,
    accessToken:
      cookies.accessToken || cookies.token || cookies.authToken || cookies.jwt,
  };
}

// Helper function to convert Firebase timestamp to ISO string
function convertFirebaseTimestamp(timestamp) {
  if (timestamp && timestamp.seconds) {
    return new Date(
      timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000
    ).toISOString();
  }
  return new Date().toISOString();
}

// Helper function to extract current user ID from JWT token
function getCurrentUserIdFromToken(token) {
  try {
    if (!token) return null;

    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const decoded = JSON.parse(jsonPayload);
    return decoded.id || decoded.userId || decoded.sub || decoded._id;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

export async function GET(request, { params }) {
  try {
    // Fix for Next.js 15 - await params
    const { conversationId } = await params;
    const cookieHeader = request.headers.get("cookie");

    if (!cookieHeader) {
      return Response.json(
        { error: "No authentication cookies" },
        { status: 401 }
      );
    }

    // Extract tokens from cookies
    const { refreshToken, accessToken } = getTokenFromCookies(cookieHeader);

    // Get access token (refresh if needed)
    let authToken = accessToken;
    if (!authToken && refreshToken) {
      try {
        const refreshResponse = await fetch(
          `${process.env.BACKEND_URL}/api/auth/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookieHeader,
            },
          }
        );

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          authToken = refreshData.accessToken || refreshData.token;
        }
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
      }
    }

    // 🔍 Get current user ID from token for proper message alignment
    const currentUserId = getCurrentUserIdFromToken(authToken);

    const headers = {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    // Call your actual backend messages endpoint
    const backendUrl = `${process.env.BACKEND_URL}/api/chat/messages?receiverId=${conversationId}`;

    const response = await fetch(backendUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      return Response.json(
        { error: "Failed to fetch messages" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform your backend data format to frontend expectations
    if (data.status === "ok" && data.messages) {
      // 🖼️ Extract user info with avatars
      const userInfo = data.userInfo || {};

      // Create user avatar mapping
      const userAvatars = {};
      if (userInfo.id1 && userInfo.id1Avatar) {
        userAvatars[userInfo.id1] = userInfo.id1Avatar;
      }
      if (userInfo.id2 && userInfo.id2Avatar) {
        userAvatars[userInfo.id2] = userInfo.id2Avatar;
      }

      const transformedMessages = data.messages.map((msg, index) => {
        const transformedMessage = {
          id: `msg_${msg.senderId}_${msg.timestamp.seconds}_${index}`,
          conversationId: conversationId,
          senderId: msg.senderId, // 🔍 Keep original sender ID for comparison
          content: msg.text,
          timestamp: convertFirebaseTimestamp(msg.timestamp),
          type: "text",
          receiverId: msg.receiverId,
          // 🖼️ Add sender's avatar from userInfo
          senderAvatar: userAvatars[msg.senderId] || null,
        };

        return transformedMessage;
      });

      return Response.json({
        messages: transformedMessages,
        userInfo: userInfo, // Pass userInfo to frontend for additional context
      });
    }

    return Response.json({ messages: [], userInfo: {} });
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    return Response.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
