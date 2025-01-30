"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import axios from "axios";
import NextImage from "next/image";
import { Image, MessageCircleMore, Forward, ThumbsUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/contexts/ProfileContext";

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

export default function SinglePost({ postId }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuth();
  const { profile } = useProfile();

  // fetch single post and comments
  useEffect(() => {
    const fetchSinglePost = async () => {
      setLoading(true);
      try {
        // await new Promise((resolve) => setTimeout(resolve, 10000));
        const response = await axios.get(
          `http://localhost:8080/api/user/post/${postId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            withCredentials: true,
          }
        );
        setPost(response.data.post);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchSinglePostComments = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:8080/api/comments/${postId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            withCredentials: true,
          }
        );
        setComments(response.data.comments || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchSinglePost();
      fetchSinglePostComments();
    }
  }, [postId, accessToken]);

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (!post) {
    return <div>No post found</div>;
  }

  // Artificial Delay for Testing
  const delay = () => {
    new Promise((resolve) => setTimeout(resolve, 10000));
  };

  return (
    <>
      <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex-row items-center gap-4 p-4 lg:px-5 lg:pt-4">
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

        <CardContent className="px-4 py-2 lg:px-5 lg:pb-5 w-full">
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
            >
              <ThumbsUp className="h-4 w-4" />
              {post.likes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <MessageCircleMore className="h-4 w-4" />
              Comment
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <Forward className="h-4 w-4" />
              Share
            </Button>
          </div>
        </CardFooter>

        {/* comments  */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-b">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Comments
          </h4>

          <div className="space-y-4 mt-4">
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <NextImage
                  src={
                    profile?.profilePicture ||
                    "https://media.discordapp.net/attachments/1315342834278207540/1316064105588719707/pf2.jpg?ex=6759afb6&is=67585e36&hm=c74adb8fccdc099b5567f29ee46e26df2bacbb440f53b16aaee5618e4927fad9&=&format=webp&width=460&height=465"
                  }
                  alt="Avatar"
                  width={36}
                  height={36}
                  className="rounded-full"
                />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {profile?.name || "User"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    now
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 outline-none placeholder-gray-500 text-sm"
                />
                <button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">
                  Post
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse mt-4">
              {Array(3)
                .fill(null)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 shadow rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-gray-300 dark:bg-gray-700 h-9 w-9"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white dark:bg-gray-800 shadow rounded-2xl p-4"
                >
                  <div className="flex items-center gap-4">
                    <NextImage
                      src={
                        comment.userProfilePicture ||
                        "https://media.discordapp.net/attachments/1315342834278207540/1316064105588719707/pf2.jpg?ex=6759afb6&is=67585e36&hm=c74adb8fccdc099b5567f29ee46e26df2bacbb440f53b16aaee5618e4927fad9&=&format=webp&width=460&height=465"
                      }
                      alt="Avatar"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {comment.userName || "User"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {timeAgo(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-700 dark:text-gray-300">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
