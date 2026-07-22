import { supabase, isSupabaseAvailable } from "./supabase";

export const VECTOR_DIM = 384;

// Simple deterministic hash & TF-IDF feature extractor to map tokens to 384D space
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function hashToken(token: string): number {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateEmbedding(text: string): number[] {
  const vector = new Array(VECTOR_DIM).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vector;

  const tfMap = new Map<string, number>();
  for (const token of tokens) {
    tfMap.set(token, (tfMap.get(token) || 0) + 1);
  }

  for (const [token, count] of tfMap.entries()) {
    const tf = count / tokens.length;
    const idx = hashToken(token) % VECTOR_DIM;
    const sign = hashToken(token + "_sign") % 2 === 0 ? 1 : -1;
    const weight = tf * (1 + Math.log(token.length));
    vector[idx] += sign * weight;
  }

  // L2 Normalize
  let normSq = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    normSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  for (let i = 0; i < VECTOR_DIM; i++) {
    vector[i] /= norm;
  }

  return vector;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, (dot + 1) / 2)); // Map [-1, 1] -> [0, 1]
}

const embeddingCache = new Map<string, { vector: number[]; updatedAt: number }>();

export async function storeDocumentEmbedding(docId: string, title: string, content: string): Promise<number[]> {
  const combinedText = `${title}\n${content}`;
  const vector = generateEmbedding(combinedText);
  embeddingCache.set(docId, { vector, updatedAt: Date.now() });

  if (isSupabaseAvailable() && supabase) {
    try {
      await supabase.from("document_embeddings").upsert({
        doc_id: docId,
        embedding: vector,
        content_snippet: combinedText.slice(0, 300),
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Offline fallback
    }
  }

  return vector;
}

export function getCachedEmbedding(docId: string): number[] | null {
  return embeddingCache.get(docId)?.vector || null;
}
