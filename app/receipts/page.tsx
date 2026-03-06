"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useDataStore } from "@/lib/data-store";
import { formatCurrency } from "@/lib/utils";
import { Camera, Upload, ScanLine, Check, FileText, Loader2, Pencil, Save } from "lucide-react";

// simulated OCR results for demo
const simulatedOCRResults = [
    { merchant: "Swiggy", amount: 485, text: "Swiggy Order #SX789\nButter Chicken x1\nGarlic Naan x2\nCoke x1\nTotal: ₹485" },
    { merchant: "BigBasket", amount: 2150, text: "BigBasket Invoice\nFruits: ₹450\nVegetables: ₹380\nDairy: ₹520\nSnacks: ₹800\nTotal: ₹2,150" },
    { merchant: "Amazon", amount: 1299, text: "Amazon.in\nAnker USB-C Hub\nItem Price: ₹1,299\nDelivery: Free\nTotal: ₹1,299" },
    { merchant: "Uber", amount: 345, text: "Uber Trip Receipt\nFrom: Home\nTo: Office\nDistance: 12.4 km\nFare: ₹345" },
    { merchant: "Reliance Fresh", amount: 890, text: "Reliance Fresh\nRice 5kg: ₹350\nOil 1L: ₹190\nSugar 1kg: ₹50\nMilk x4: ₹300\nTotal: ₹890" },
];

export default function ReceiptsPage() {
    const { receipts, addReceipt, addTransaction, categories } = useDataStore();
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ merchant: string, amount: number, text: string, imageUrl?: string } | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editMerchant, setEditMerchant] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // real OCR scanning
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanning(true);
        setConfirmed(false);
        setEditing(false);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/scan", {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                throw new Error("Failed to scan receipt");
            }

            const data = await res.json();
            setScanResult({
                merchant: data.merchant || "Unknown",
                amount: data.amount || 0,
                text: data.text || "No text extracted",
                imageUrl: data.imageUrl
            });
        } catch (err) {
            console.error("Scan error:", err);
            // Fallback for demo if API fails
            alert("Failed to scan receipt. Returning dummy data.");
            setScanResult(simulatedOCRResults[0]);
        } finally {
            setScanning(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // enter edit mode
    const handleEdit = () => {
        if (!scanResult) return;
        setEditMerchant(scanResult.merchant);
        setEditAmount(String(scanResult.amount));
        setEditing(true);
    };

    // save edits
    const handleSaveEdit = () => {
        if (!scanResult) return;
        const parsedAmount = parseFloat(editAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return;
        setScanResult({
            ...scanResult,
            merchant: editMerchant.trim() || scanResult.merchant,
            amount: parsedAmount,
        });
        setEditing(false);
    };

    // confirm the scanned receipt and add transaction
    const handleConfirm = () => {
        if (!scanResult) return;

        // add receipt to data store
        addReceipt({
            image_url: scanResult.imageUrl || "/receipt-scan.jpg",
            ocr_text: scanResult.text,
            merchant: scanResult.merchant,
            amount: scanResult.amount,
        });

        // also add as a transaction
        addTransaction({
            merchant: scanResult.merchant,
            category: categories[0]?.name || "Uncategorized",
            amount: scanResult.amount,
            date: new Date().toISOString().split("T")[0],
            notes: "Added from receipt scan",
        });

        setConfirmed(true);
        setEditing(false);
        setTimeout(() => {
            setScanResult(null);
            setConfirmed(false);
        }, 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Receipts</h1>
                <p className="text-muted-foreground mt-1">
                    Scan receipts and automatically extract transaction data
                </p>
            </div>

            {/* upload area */}
            <Card>
                <CardContent className="p-8">
                    <div className="flex flex-col items-center text-center">
                        {/* upload zone */}
                        <div
                            className="w-full max-w-md border-2 border-dashed border-border rounded-xl p-8 hover:border-primary/50 transition-colors cursor-pointer mb-6"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Camera className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                            <h3 className="font-medium mb-1">Upload Receipt Image</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Drag and drop or click to select an image
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <Button variant="outline" className="gap-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                <Upload className="h-4 w-4" />
                                Choose File
                            </Button>
                        </div>

                        {/* trigger file input */}
                        <Button onClick={() => fileInputRef.current?.click()} disabled={scanning} className="gap-2">
                            {scanning ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <ScanLine className="h-4 w-4" />
                                    Scan New Receipt
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* scan result */}
            {scanResult && !confirmed && (
                <Card className="border-primary/30 animate-scale-in">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <ScanLine className="h-4 w-4 text-primary" />
                                    Scan Result
                                </CardTitle>
                                <CardDescription className="mt-1">Review the extracted data and confirm</CardDescription>
                            </div>
                            {!editing && (
                                <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* extracted text */}
                        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                            {scanResult.text}
                        </div>

                        {/* extracted fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-muted-foreground">Merchant</Label>
                                {editing ? (
                                    <Input
                                        value={editMerchant}
                                        onChange={(e) => setEditMerchant(e.target.value)}
                                        className="mt-1"
                                        placeholder="Merchant name"
                                    />
                                ) : (
                                    <p className="font-medium">{scanResult.merchant}</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Amount</Label>
                                {editing ? (
                                    <Input
                                        type="number"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        className="mt-1"
                                        placeholder="Amount"
                                        min="0"
                                        step="0.01"
                                    />
                                ) : (
                                    <p className="font-medium text-lg">{formatCurrency(scanResult.amount)}</p>
                                )}
                            </div>
                        </div>

                        {editing ? (
                            <div className="flex gap-3">
                                <Button onClick={handleSaveEdit} className="gap-2 flex-1">
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </Button>
                                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <Button onClick={handleConfirm} className="gap-2 flex-1">
                                    <Check className="h-4 w-4" />
                                    Confirm & Add Transaction
                                </Button>
                                <Button variant="outline" onClick={() => setScanResult(null)} className="flex-1">
                                    Discard
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* confirmed message */}
            {confirmed && (
                <Card className="border-green-300 dark:border-green-800/30 animate-scale-in">
                    <CardContent className="p-6 flex items-center gap-3 text-green-600">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">Transaction added successfully!</span>
                    </CardContent>
                </Card>
            )}

            <Separator />

            {/* previous receipts */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Previous Receipts</h2>
                {receipts.length === 0 ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                            <FileText className="h-5 w-5 mr-2" />
                            No receipts scanned yet
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {receipts.map((receipt) => (
                            <Card key={receipt.id}>
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{receipt.merchant}</span>
                                        <Badge variant="secondary">{formatCurrency(receipt.amount)}</Badge>
                                    </div>
                                    <div className="bg-muted/50 rounded p-3 font-mono text-xs whitespace-pre-wrap max-h-24 overflow-y-auto">
                                        {receipt.ocr_text}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(receipt.created_at).toLocaleDateString("en-IN")}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
