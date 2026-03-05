import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runPipeline, PipelineError } from '@/lib/ai/pipeline';
import { normalizeMerchantKey, logMerchantVote } from '@/lib/utils/categories';
import { logger } from '@/lib/utils/logger';

/* ============================================================
   ATLAS — /api/scan — Main OCR Pipeline Endpoint
   ============================================================ */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    let storagePaths: string[] = [];

    try {
        // Auth check
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse form data
        const formData = await request.formData();
        const imageFiles = formData.getAll('images') as File[];
        const tornMode = formData.get('torn_mode') === 'true';

        if (imageFiles.length === 0) {
            return NextResponse.json(
                { error: 'No images provided' },
                { status: 400 }
            );
        }

        // Validate file types and sizes
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB

        for (const file of imageFiles) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                return NextResponse.json(
                    { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, HEIC` },
                    { status: 400 }
                );
            }
            if (file.size > MAX_SIZE) {
                return NextResponse.json(
                    { error: 'File too large. Maximum size is 10MB.' },
                    { status: 400 }
                );
            }
        }

        // Step 1: Upload images to Supabase Storage (temp)
        logger.info('Scan', 'Uploading images to temp storage');

        for (const file of imageFiles) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = `temp/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.type.split('/')[1]}`;

            const { error: uploadError } = await supabase.storage
                .from('receipt-images')
                .upload(fileName, buffer, {
                    contentType: file.type,
                    upsert: false,
                });

            if (uploadError) {
                logger.warn('Scan', `Storage upload failed (non-fatal): ${uploadError.message}`);
            } else {
                storagePaths.push(fileName);
            }
        }

        // Step 2-5: Run dual-model pipeline
        logger.info('Scan', 'Starting dual-model pipeline');

        const primaryBuffer = Buffer.from(await imageFiles[0].arrayBuffer());
        const primaryMimeType = imageFiles[0].type;

        const additionalImages = await Promise.all(
            imageFiles.slice(1).map(async (file) => ({
                buffer: Buffer.from(await file.arrayBuffer()),
                mimeType: file.type,
            }))
        );

        const pipelineResult = await runPipeline(
            primaryBuffer,
            primaryMimeType,
            tornMode,
            additionalImages
        );

        // Step 6: Log merchant vote (CrowdTag stub)
        if (pipelineResult.winner.merchant) {
            const merchantKey = normalizeMerchantKey(pipelineResult.winner.merchant);
            const dominantCategory = pipelineResult.winner.items.length > 0
                ? pipelineResult.winner.items.reduce((prev, curr) =>
                    curr.total_price > prev.total_price ? curr : prev
                ).category
                : 'Other';

            await logMerchantVote(merchantKey, dominantCategory, user.id);
        }

        logger.info('Scan', 'Pipeline complete', {
            model: pipelineResult.model_used,
            confidence: pipelineResult.winner.overall_confidence,
            items: pipelineResult.winner.items.length,
        });

        // Return result
        return NextResponse.json(pipelineResult.winner);
    } catch (error) {
        if (error instanceof PipelineError) {
            return NextResponse.json(
                {
                    error: error.message,
                    confidence: error.confidence,
                },
                { status: 422 }
            );
        }

        logger.error('Scan', 'Pipeline failed', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred during receipt processing' },
            { status: 500 }
        );
    } finally {
        // Step 7: Delete images from storage (regardless of success/failure)
        if (storagePaths.length > 0) {
            try {
                const supabase = await createSupabaseServerClient();
                const { error: deleteError } = await supabase.storage
                    .from('receipt-images')
                    .remove(storagePaths);

                if (deleteError) {
                    logger.warn('Scan', `Failed to delete temp images: ${deleteError.message}`);
                } else {
                    logger.info('Scan', `Deleted ${storagePaths.length} temp images`);
                }
            } catch (cleanupError) {
                logger.error('Scan', 'Cleanup failed', cleanupError);
            }
        }
    }
}
