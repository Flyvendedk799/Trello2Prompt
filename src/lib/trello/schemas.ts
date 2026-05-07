import { z } from "zod";

export const TrelloLabelSchema = z.object({
  id: z.string(),
  idBoard: z.string().optional(),
  name: z.string().nullable().default(""),
  color: z.string().nullable().default(null),
});

export const TrelloCheckItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.enum(["complete", "incomplete"]),
  pos: z.number().optional(),
});

export const TrelloChecklistSchema = z.object({
  id: z.string(),
  name: z.string(),
  checkItems: z.array(TrelloCheckItemSchema).default([]),
});

export const TrelloAttachmentSchema = z.object({
  id: z.string(),
  name: z.string().nullable().default(""),
  url: z.string().nullable().default(""),
});

export const TrelloMemberLiteSchema = z.object({
  id: z.string(),
  fullName: z.string().optional(),
  username: z.string().optional(),
});

export const TrelloListSchema = z.object({
  id: z.string(),
  name: z.string(),
  closed: z.boolean().default(false),
  pos: z.number().optional(),
  idBoard: z.string().optional(),
});

export const TrelloCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string().default(""),
  closed: z.boolean().default(false),
  idList: z.string(),
  idBoard: z.string().optional(),
  idLabels: z.array(z.string()).default([]),
  idMembers: z.array(z.string()).default([]),
  idChecklists: z.array(z.string()).default([]),
  labels: z.array(TrelloLabelSchema).default([]),
  due: z.string().nullable().default(null),
  dueComplete: z.boolean().default(false),
  dateLastActivity: z.string().optional(),
  url: z.string().optional(),
  shortUrl: z.string().optional(),
  pos: z.number().optional(),
  attachments: z.array(TrelloAttachmentSchema).optional(),
  checklists: z.array(TrelloChecklistSchema).optional(),
});

export const TrelloBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string().default(""),
  closed: z.boolean().default(false),
  url: z.string().optional(),
  shortUrl: z.string().optional(),
  dateLastActivity: z.string().optional().nullable(),
});

export const TrelloActionCommentSchema = z.object({
  id: z.string(),
  type: z.literal("commentCard"),
  date: z.string(),
  data: z.object({
    text: z.string().default(""),
  }),
  memberCreator: z
    .object({
      id: z.string(),
      fullName: z.string().optional(),
      username: z.string().optional(),
    })
    .optional(),
});

export type TrelloLabel = z.infer<typeof TrelloLabelSchema>;
export type TrelloCheckItem = z.infer<typeof TrelloCheckItemSchema>;
export type TrelloChecklist = z.infer<typeof TrelloChecklistSchema>;
export type TrelloAttachment = z.infer<typeof TrelloAttachmentSchema>;
export type TrelloList = z.infer<typeof TrelloListSchema>;
export type TrelloCard = z.infer<typeof TrelloCardSchema>;
export type TrelloBoard = z.infer<typeof TrelloBoardSchema>;
export type TrelloActionComment = z.infer<typeof TrelloActionCommentSchema>;
