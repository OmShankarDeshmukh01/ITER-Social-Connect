"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProvider";
import { BACKEND_URL } from "@/configs/index";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SigninForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // New state for switching between student and teacher sign-in flows.
  const [userType, setUserType] = useState("student"); // "student" or "teacher"
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/explore");
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Send login credentials to the backend
      const response = await axios.post(
        `${BACKEND_URL}/api/auth/signin`,
        { email, password },
        { withCredentials: true }
      );

      if (response.status === 200) {
        const { accessToken, user } = response.data;
        login(user, accessToken);
        router.push("/explore");
      } else {
        throw new Error("Unexpected response status");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        "Failed to sign in. Please check your credentials and try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle Switch for Student/Teacher Signin */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1">
          <button
            onClick={() => setUserType("student")}
            className={`px-4 py-2 rounded-full transition-colors duration-200 ${
              userType === "student"
                ? "bg-white text-gray-900 shadow-md"
                : "bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900"
            }`}
          >
            Student
          </button>
          <button
            onClick={() => setUserType("teacher")}
            className={`px-4 py-2 rounded-full transition-colors duration-200 ${
              userType === "teacher"
                ? "bg-white text-gray-900 shadow-md"
                : "bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900"
            }`}
          >
            Teacher
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <Label
            htmlFor="password"
            className="text-gray-700 dark:text-gray-300"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 dark:text-gray-300 focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div></div>
          <button
            type="button"
            onClick={() => router.push("/forget-password")}
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none"
          >
            Forgot password?
          </button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
