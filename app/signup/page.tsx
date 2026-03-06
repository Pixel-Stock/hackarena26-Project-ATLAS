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
import { UserPlus, User, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
    const router = useRouter();
    const { updateUser } = useDataStore();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name || !email || !password || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        // simulate auth delay
        await new Promise((r) => setTimeout(r, 800));

        updateUser({ name, email });
        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12 animate-fade-in">
            <div className="w-full max-w-md space-y-6">
                {/* brand */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <img src="/logo.png" alt="SnapBudget" className="h-12 w-12 rounded-full object-cover shadow-lg" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
                    <p className="text-muted-foreground">
                        Get started with SnapBudget
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Sign Up
                        </CardTitle>
                        <CardDescription>
                            Fill in your details to create your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="signup-name" className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5" />
                                    Full Name
                                </Label>
                                <Input
                                    id="signup-name"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="signup-email" className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email Address
                                </Label>
                                <Input
                                    id="signup-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="signup-password" className="flex items-center gap-2">
                                    <Lock className="h-3.5 w-3.5" />
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="signup-password"
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

                            <div className="space-y-2">
                                <Label htmlFor="signup-confirm" className="flex items-center gap-2">
                                    <Lock className="h-3.5 w-3.5" />
                                    Confirm Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="signup-confirm"
                                        type={showConfirm ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                                {loading ? "Creating account..." : "Create Account"}
                            </Button>
                        </form>

                        <Separator className="my-6" />

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/signin" className="text-primary font-medium hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
