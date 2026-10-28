import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import {
  accountOwner,
  BLOCKED_EXTENSIONS,
  ensureGuestOwner,
  getMaxUploadBytes,
  guestOwnerFromToken,
  guestTokenFromRequest,
} from "./uploadSecurity";
import {
  isDeletionSupported,
  isStorageReady,
  PUBLIC_STORAGE_PREFIX,
  storageDelete,
} from "./storage";
import { ENV } from "./_core/env";

const uploadCategory = z.enum(["image", "pdf", "audio", "video", "document", "archive", "other"]);
const sortOption = z.enum(["newest", "oldest", "largest", "smallest", "name_asc", "name_desc"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  uploads: router({
    config: publicProcedure.query(() => ({
      maxFileSizeBytes: getMaxUploadBytes(),
      deletionSupported: isDeletionSupported(),
      storageReady: isStorageReady(),
      databaseReady: db.isDatabaseReady(),
      storageDriver: ENV.storageDriver,
      blockedExtensions: Array.from(BLOCKED_EXTENSIONS),
    })),
    list: publicProcedure
      .input(
        z
          .object({
            search: z.string().trim().max(255).optional(),
            category: uploadCategory.optional(),
            sort: sortOption.optional(),
            offset: z.number().int().min(0).max(1_000_000).optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const owner = ctx.user ? accountOwner(ctx.user) : ensureGuestOwner(ctx.req, ctx.res);
        const { offset = 0, ...filter } = input ?? {};
        const page = await db.listUploads(owner.ownerHash, filter, offset);
        return {
          ownerType: owner.ownerType,
          authenticated: Boolean(ctx.user),
          deletionSupported: isDeletionSupported(),
          hasMore: page.hasMore,
          files: page.files.map(file => ({
            id: file.id,
            name: file.originalName,
            category: file.category,
            contentType: file.contentType,
            sizeBytes: file.sizeBytes,
            createdAt: file.createdAt,
            url: `${PUBLIC_STORAGE_PREFIX}/${file.objectKey}`,
            previewUrl: `/preview/${file.id}`,
          })),
        };
      }),
    getById: publicProcedure
      .input(z.object({ id: z.string().trim().min(1).max(64) }))
      .query(async ({ ctx, input }) => {
        const file = await db.getUploadById(input.id);
        if (!file) {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
        }
        const guestToken = guestTokenFromRequest(ctx.req);
        const currentOwnerHash = ctx.user
          ? accountOwner(ctx.user).ownerHash
          : guestToken
            ? guestOwnerFromToken(guestToken).ownerHash
            : null;
        return {
          id: file.id,
          name: file.originalName,
          category: file.category,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
          createdAt: file.createdAt,
          url: `${PUBLIC_STORAGE_PREFIX}/${file.objectKey}`,
          downloadUrl: `${PUBLIC_STORAGE_PREFIX}/${file.objectKey}?download=1`,
          previewUrl: `/preview/${file.id}`,
          isOwner: Boolean(currentOwnerHash && currentOwnerHash === file.ownerHash),
          deletionSupported: isDeletionSupported(),
        };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.string().trim().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        if (!isDeletionSupported()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Physical deletion is not supported by the current remote storage provider.",
          });
        }
        const guestToken = guestTokenFromRequest(ctx.req);
        const ownerHash = ctx.user
          ? accountOwner(ctx.user).ownerHash
          : guestToken
            ? guestOwnerFromToken(guestToken).ownerHash
            : null;
        if (!ownerHash) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to delete this file.",
          });
        }
        const record = await db.getUploadById(input.id);
        if (!record) {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
        }
        if (record.ownerHash !== ownerHash) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to delete a file owned by another user.",
          });
        }
        const deletedFromStorage = await storageDelete(record.objectKey);
        if (!deletedFromStorage) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not delete file from storage.",
          });
        }
        await db.deleteUploadByOwner(record.id, ownerHash);
        return { deleted: true, id: record.id } as const;
      }),
    claimGuestFiles: publicProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) return { claimed: false, count: 0 };
      const token = guestTokenFromRequest(ctx.req);
      if (!token) return { claimed: false, count: 0 };
      const guest = guestOwnerFromToken(token);
      const account = accountOwner(ctx.user);
      if (guest.ownerHash === account.ownerHash) return { claimed: false, count: 0 };
      await db.claimGuestUploads(guest.ownerHash, account.ownerHash);
      return { claimed: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
