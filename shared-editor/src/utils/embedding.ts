import { supabase, isSupabaseAvailable } from "./supabase";

export const VECTOR_DIM = 384;

// Lazy-loaded transformers.js pipeline
let extractor: any = null;

async function getExtractor() {
  if (extractor) return extractor;
  try {
    const { pipeline } = await import("@xenova/transformers");
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    return extractor;
  } catch {
    return null;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getExtractor();
  if (pipe) {
    const result = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(result.data) as number[];
  }

  // Fallback: simple hash-based embedding (offline/no-wasm)
  const vector = new Array(VECTOR_DIM).fill(0);
  const tokens = text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);
  if (tokens.length === 0) return vector;
  const tfMap = new Map<string, number>();
  for (const token of tokens) tfMap.set(token, (tfMap.get(token) || 0) + 1);
  for (const [token, count] of tfMap.entries()) {
    const tf = count / tokens.length;
    let hash = 0;
    for (let i = 0; i < token.length; i++) { hash = (hash << 5) - hash + token.charCodeAt(i); hash |= 0; }
    const idx = Math.abs(hash) % VECTOR_DIM;
    const sign = Math.abs(hash * 31) % 2 === 0 ? 1 : -1;
    vector[idx] += sign * tf * (1 + Math.log(token.length));
  }
  let normSq = 0;
  for (let i = 0; i < VECTOR_DIM; i++) normSq += vector[i] * vector[i];
  const norm = Math.sqrt(normSq) || 1;
  for (let i = 0; i < VECTOR_DIM; i++) vector[i] /= norm;
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
  const vector = await generateEmbedding(combinedText);
  embeddingCache.set(docId, { vector, updatedAt: Date.now() });

  if (isSupabaseAvailable() && supabase) {
    try {
      await supabase.from("document_embeddings").upsert({
        note_id: docId,
        embedding: vector,
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
