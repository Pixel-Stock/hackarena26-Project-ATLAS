"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useDataStore } from "@/lib/data-store";
import { LogIn, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
    const router = useRouter();
    const { updateUser } = useDataStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);
        // simulate auth delay
        await new Promise((r) => setTimeout(r, 800));

        updateUser({ email });
        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6 animate-fade-in">
            <div className="w-full max-w-md space-y-6">
                {/* brand */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <img src="/logo.png" alt="SnapBudget" className="h-12 w-12 rounded-full object-cover shadow-lg" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                    <p className="text-muted-foreground">
                        Sign in to your SnapBudget account
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <LogIn className="h-5 w-5" />
                            Sign In
                        </CardTitle>
                        <CardDescription>
                            Enter your credentials to continue
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignIn} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="signin-email" className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email Address
                                </Label>
                                <Input
                                    id="signin-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="signin-password" className="flex items-center gap-2">
                                    <Lock className="h-3.5 w-3.5" />
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="signin-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#C96442] transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive font-medium">{error}</p>
                            )}

                            <Button type="submit" className="w-full gap-2" disabled={loading}>
                                {loading ? (
                                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <ArrowRight className="h-4 w-4" />
                                )}
                                {loading ? "Signing in..." : "Sign In"}
                            </Button>
                        </form>

                        <Separator className="my-6" />

                        <p className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="text-primary font-medium hover:underline">
                                Sign Up
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
