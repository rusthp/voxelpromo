import mongoose, { Schema, Document } from 'mongoose';

/**
 * Instagram Conversion Tracking
 *
 * Rastreia quando um link de afiliado é enviado via DM do Instagram
 * em resposta a um Story/Post/Reel.
 *
 * Usado para:
 * - Métricas de conversão por oferta
 * - Dedup (não enviar 2x para mesmo usuário)
 * - ROI por campanha/criativo
 */
export interface InstagramConversionDocument extends Document {
  offerId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Dono da conta (multi-tenant)
  igSenderId: string; // IG User ID de quem mandou mensagem
  mediaId?: string; // ID da mídia respondida
  mediaType?: 'story' | 'post' | 'reel' | 'dm';
  source: 'story_reply' | 'post_comment' | 'dm_keyword' | 'dm_direct';
  affiliateUrl: string;
  sentAt: Date;
  metadata?: {
    messageText?: string; // Texto original (sanitizado)
    offerTitle?: string; // Título da oferta para contexto
    responseDelayMs?: number; // Delay antes de responder
    matchedKeyword?: string; // Qual keyword fez match
  };
}

const InstagramConversionSchema = new Schema<InstagramConversionDocument>({
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  igSenderId: {
    type: String,
    required: true,
    index: true,
  },
  mediaId: {
    type: String,
    index: true,
  },
  mediaType: {
    type: String,
    enum: ['story', 'post', 'reel', 'dm'],
  },
  source: {
    type: String,
    enum: ['story_reply', 'post_comment', 'dm_keyword', 'dm_direct'],
    required: true,
  },
  affiliateUrl: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  metadata: {
    messageText: { type: String, maxlength: 200 }, // Limitar para não armazenar lixo
    offerTitle: { type: String },
    responseDelayMs: { type: Number },
    matchedKeyword: { type: String },
  },
});

// Índice composto para dedup: 1 link por usuário por oferta
InstagramConversionSchema.index({ offerId: 1, igSenderId: 1 }, { unique: true });

// Índice para métricas por período
InstagramConversionSchema.index({ userId: 1, sentAt: -1 });

// Índice para busca por mídia
InstagramConversionSchema.index({ mediaId: 1, source: 1 });

export const InstagramConversionModel = mongoose.model<InstagramConversionDocument>(
  'InstagramConversion',
  InstagramConversionSchema
);
