import {
  env,
  HF_FLUX_SCHNELL_ROUTER_URL,
  requireHuggingfaceToken,
} from "../config/env.js";

export type GeneratedImageBytes = {
  buffer: Buffer;
  mimeType: string;
};

export async function generateImageFromPrompt(
  prompt: string,
): Promise<GeneratedImageBytes> {
  const token = requireHuggingfaceToken();
  const url = env.huggingfaceImageApiUrl;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        num_inference_steps: env.huggingfaceImageNumInferenceSteps,
        guidance_scale: env.huggingfaceImageGuidanceScale,
      },
    }),
  });

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();

  if (!res.ok) {
    let detail: string;
    try {
      if (contentType.includes("json")) {
        detail = JSON.stringify(await res.json());
      } else {
        detail = await res.text();
      }
    } catch {
      detail = res.statusText;
    }
    throw new Error(
      `Hugging Face image API failed (${res.status}): ${detail.slice(0, 500)}`,
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (contentType.startsWith("image/")) {
    return { buffer, mimeType: contentType };
  }

  // Some routers return PNG without a reliable Content-Type
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { buffer, mimeType: "image/png" };
  }

  throw new Error(
    `Hugging Face returned a non-image response. Expected endpoint like ${HF_FLUX_SCHNELL_ROUTER_URL} and compatible model parameters.`,
  );
}
