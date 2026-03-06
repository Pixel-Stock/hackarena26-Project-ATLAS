"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/utils";
import { User, Mail, Calendar, Save, Receipt, Tag, Camera, LogOut } from "lucide-react";

export default function ProfilePage() {
    const router = useRouter();
    const { user, transactions, categories, receipts, updateUser } = useDataStore();
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [saved, setSaved] = useState(false);

    // calculate user stats
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    const uniqueCategories = new Set(transactions.map((t) => t.category)).size;

    // save profile
    const handleSave = () => {
        updateUser({ name, email });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // logout
    const handleLogout = () => {
        router.push("/");
    };

    const stats = [
        {
            label: "Total Spending",
            value: formatCurrency(totalSpending),
            icon: Receipt,
            color: "text-chart-1",
        },
        {
            label: "Transactions",
            value: String(transactions.length),
            icon: Receipt,
            color: "text-chart-2",
        },
        {
            label: "Categories",
            value: String(uniqueCategories),
            icon: Tag,
            color: "text-chart-4",
        },
        {
            label: "Receipts Scanned",
            value: String(receipts.length),
            icon: Camera,
            color: "text-chart-5",
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your account and view statistics
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* profile card */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                        <CardDescription>Update your personal information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* avatar section */}
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                                <AvatarFallback className="text-2xl">
                                    {user.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="text-lg font-semibold">{user.name}</h3>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>

                        <Separator />

                        {/* edit form */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="profile-name" className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5" />
                                    Full Name
                                </Label>
                                <Input
                                    id="profile-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profile-email" className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email Address
                                </Label>
                                <Input
                                    id="profile-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Member Since
                                </Label>
                                <Input
                                    value={new Date(user.created_at).toLocaleDateString("en-IN", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                    disabled
                                />
                            </div>

                            <Button onClick={handleSave} className="gap-2">
                                <Save className="h-4 w-4" />
                                {saved ? "Saved!" : "Save Changes"}
                            </Button>
                        </div>

                        <Separator />

                        {/* logout */}
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Button>
                    </CardContent>
                </Card>

                {/* stats sidebar */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Statistics</h2>
                    {stats.map((stat) => (
                        <Card key={stat.label}>
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    <p className="text-lg font-bold">{stat.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
