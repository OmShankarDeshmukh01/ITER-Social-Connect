"use client";

/**
 * Todos: 1. Add Likes
 * 2. Add Share
 * 3. Bookmark fetch already existing post for particular user
 * 4. Save the scroll state
 * 5. Without logging, the post button shows loading....
 */

/** Imports */
import { useEffect, useState, useRef, useCallback } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProvider";
import { useProfile } from "@/contexts/ProfileContext";
import { BACKEND_URL } from "@/configs/index";
import axios from "axios";
import PostsPreloader from "@/components/preloaders/PostsPreloader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Image,
  MessageCircleMore,
  Forward,
  ThumbsUp,
  Bookmark,
  BookmarkCheck,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

/**
 * Time Handler Function
 */
export const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "1 min ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return `${years} years ago`;
};

export default function MainFeed() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [newPostContent, setNewPostContent] = useState("");
  const [fetchingUser, setFetchingUser] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [likeLoadingState, setLikeLoadingState] = useState({});
  const [likeError, setLikeError] = useState(null);
  const [bookmarkLoadingState, setBookmarkLoadingState] = useState({});
  const [bookmarkError, setBookmarkError] = useState(null);
  const { accessToken } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const observer = useRef();

  /* Once the profile is loaded, we mark fetchingUser as false.*/
  useEffect(() => {
    if (profile) {
      setFetchingUser(false);
    }
  }, [profile]);

  /* Fetch The User Feed */
  const fetchPosts = useCallback(async () => {
    if (!hasMore) return;

    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/feed`, {
        params: { page, limit: 10 },
        withCredentials: true,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      let newPosts = response.data.posts || [];
      const currentUserId = profile?.userId;
      if (currentUserId) {
        newPosts = newPosts.map((post) => ({
          ...post,
          isLiked: Array.isArray(post.likes)
            ? post.likes.includes(currentUserId)
            : false,
          likeCount:
            post.likeCount !== undefined
              ? post.likeCount
              : Array.isArray(post.likes)
              ? post.likes.length
              : 0,
        }));
      } else {
        newPosts = newPosts.map((post) => ({
          ...post,
          isLiked: false,
          likeCount:
            post.likeCount !== undefined
              ? post.likeCount
              : Array.isArray(post.likes)
              ? post.likes.length
              : 0,
        }));
      }

      setPosts((prevPosts) => [...prevPosts, ...newPosts]);
      setHasMore(newPosts.length === 10);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, accessToken, profile]);

  /* Update posts mapping once profile is available (or changes) */
  useEffect(() => {
    const currentUserId = profile?.userId || profile?.id;
    if (currentUserId) {
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          const computedIsLiked = Array.isArray(post.likes)
            ? post.likes.includes(currentUserId)
            : false;
          /* Only update if there is a difference.*/
          if (computedIsLiked !== post.isLiked) {
            return { ...post, isLiked: computedIsLiked };
          }
          return post;
        })
      );
    }
  }, [profile]);

  /* Fetch posts when page changes */
  useEffect(() => {
    fetchPosts();
  }, [page, fetchPosts]);

  /* Infinite Post Functionality */
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  /* Post Creation */
  const handlePostSubmit = async () => {
    if (!newPostContent.trim()) return;

    setIsPosting(true);
    
    const tempPost = {
      id: "temp",
      userName: profile.name,
      content: newPostContent,
      profilePicture: profile.profilePicture,
      likes: [],
      likeCount: 0,
      createdAt: new Date().toISOString(),
    };
    setNewPostContent("");
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/user/post`,
        { profilePicture: profile.profilePicture, content: newPostContent },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        }
      );
      const { postId } = response.data;
      setPosts((prevPosts) => [
        { ...tempPost, id: postId },
        ...prevPosts.filter((post) => post.id !== "temp"),
      ]);
    } catch (err) {
      console.error("Error creating new post:", err);
      alert("Failed to post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  /* Like Service */
  const toggleLike = async (postId) => {
    // Find the post to update and determine the new optimistic values.
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          // Optimistically update: if the post was not liked, add 1; if liked, subtract 1.
          const newCount = post.isLiked ? post.likeCount - 1 : post.likeCount + 1;
          return { ...post, isLiked: !post.isLiked, likeCount: newCount };
        }
        return post;
      })
    );
  
    try {
      // Send the like/unlike request.
      const response = await axios.post(
        `${BACKEND_URL}/api/user/posts/like`,
        { postId },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        }
      );
  
      // Reconcile with the server's response:
      // The response should include the aggregated totalLikes.
      const serverCount = response.data.totalLikes;
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId ? { ...post, likeCount: serverCount } : post
        )
      );
    } catch (error) {
      
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1,
              }
            : post
        )
      );
      setLikeError(
        error.response?.data?.message || "Failed to like/unlike the post"
      );
    } finally {
      setLikeLoadingState(prev => ({ ...prev, [postId]: false }));
    }
  };
  

  /* Bookmark Service */
  const toggleBookmark = async (postId) => {
    if (!accessToken) return;

    setBookmarkLoadingState((prev) => ({ ...prev, [postId]: true }));
    setBookmarkError(null);

    try {
      await axios.post(
        `${BACKEND_URL}/api/user/post/${postId}/bookmark`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        }
      );
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, isBookmarked: !post.isBookmarked }
            : post
        )
      );
    } catch (error) {
      setBookmarkError(
        error.response?.data?.message || "Failed to bookmark"
      );
    } finally {
      setBookmarkLoadingState((prev) => ({ ...prev, [postId]: false }));
    }
  };

  /* Artificial Delay (if needed) */
  const delay = () => new Promise((resolve) => setTimeout(resolve, 10000));

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto space-y-4">
      {/* Post creation */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="bg-gray-300 dark:bg-gray-700 animate-pulse rounded-full transition-all duration-700 w-10 h-10"></div>
            ) : (
              <NextImage
                src={
                  profile?.profilePicture ||
                  "https://media.discordapp.net/attachments/1315342834278207540/1316064150744465488/pf3.jpg?ex=67aeb880&is=67ad6700&hm=6e6ddf2d18fafd444067157eadf5fca55fb42356917cc25053580375ee7d8940&=&format=webp&width=482&height=487"
                }
                alt="Avatar"
                width={40}
                height={40}
                className="rounded-full"
                priority
                style={{
                  objectFit: "cover",
                  objectPosition: "center",
                  width: "40px",
                  height: "40px",
                }}
              />
            )}
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="resize-none bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-lg text-gray-900 dark:text-gray-100"
              />
              <div className="mt-4 flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                  disabled
                >
                  <Image className="h-4 w-4 mr-2" />
                  Image
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                  onClick={handlePostSubmit}
                  disabled={fetchingUser || isPosting}
                >
                  {isPosting
                    ? "Posting..."
                    : fetchingUser
                    ? "Loading..."
                    : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preloader for a single post */}
      {isPosting && (
        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-700 animate-pulse">
          <CardHeader className="flex-row items-center gap-4 p-4">
            <div className="rounded-full bg-gray-300 dark:bg-gray-700 h-12 w-12"></div>
            <div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-2">
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
          </CardContent>
        </Card>
      )}

      {/* Initial Preloader */}
      {loading && <PostsPreloader />}

      {/* Error message */}
      {error && (
        <p className="text-red-500">Error loading posts: {error.message}</p>
      )}

      {/* Posts */}
      {posts.map((post, index) => {
        const uniqueKey = post.id ? `${post.id}-${index}` : index;
        return (
          <Card
            className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            key={uniqueKey}
            ref={index === posts.length - 1 ? lastPostRef : null}
          >
            <CardHeader
              className="flex-row items-center gap-4 p-4 lg:px-5 lg:pt-4"
              onClick={() => router.push(`/post/${post.id}`)}
            >
              <NextImage
                src={
                  post.profilePicture ||
                  "https://res.cloudinary.com/dkjsi6iwm/image/upload/v1734123569/profile.jpg"
                }
                alt="Avatar"
                width={48}
                height={48}
                className="rounded-full"
                priority
                style={{
                  objectFit: "cover",
                  objectPosition: "center",
                  width: "48px",
                  height: "48px",
                }}
              />
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                  {post.userName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {timeAgo(post.createdAt)}
                </p>
              </div>
            </CardHeader>
            <CardContent
              className="px-4 py-3 lg:px-5 lg:pb-5 w-full"
              onClick={() => router.push(`/post/${post.id}`)}
            >
              <p className="text-gray-700 dark:text-gray-300 break-words">
                {post.content}
              </p>
            </CardContent>
            <CardFooter className="border-t border-gray-200 dark:border-gray-700 p-2">
              <div className="flex justify-between w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(post.id);
                  }}
                  disabled={likeLoadingState[post.id]}
                >
                  {likeLoadingState[post.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp
                      className={`h-4 w-4 ${post.isLiked ? "text-blue-600" : ""}`}
                    />
                  )}
                  <span>{post.likeCount}</span>
                  {likeError && (
                    <p className="text-red-500 text-sm mt-2">{likeError}</p>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => router.push(`/post/${post.id}`)}
                >
                  <MessageCircleMore className="h-4 w-4" />
                  <div className="hidden md:block">Comments</div>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <Forward className="h-4 w-4" />
                  <div className="hidden md:block">Share</div>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => toggleBookmark(post.id)}
                  disabled={bookmarkLoadingState[post.id]}
                >
                  {bookmarkLoadingState[post.id] ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  ) : post.isBookmarked ? (
                    <BookmarkCheck className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Bookmark className="h-5 w-5 hover:text-gray-700" />
                  )}
                  <div className="hidden md:block">Bookmark</div>
                  {bookmarkError && (
                    <p className="text-red-500 text-sm mt-2">{bookmarkError}</p>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      })}
      {loading && hasMore && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-600 dark:border-gray-300"></div>
        </div>
      )}
      {!hasMore && (
        <p className="flex justify-center align-center ">
          No more posts to load.
        </p>
      )}
    </div>
  );
}
