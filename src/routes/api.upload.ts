import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { randomUUID } from "node:crypto";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentLength = request.headers.get("content-length");
          console.log(`[API Upload] Incoming upload payload size: ${contentLength ? (parseInt(contentLength) / (1024 * 1024)).toFixed(2) : "unknown"} MB`);

          const formData = await request.formData();
          const templateFile = formData.get("template") as File | null;
          const metadataStr = formData.get("metadata") as string | null;

          if (!templateFile || !metadataStr) {
            return new Response(
              JSON.stringify({ error: "Missing template file or metadata" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Generate unique batch ID
          const batchId = randomUUID();
          
          // Define directory structure
          const uploadsDir = path.resolve("./uploads");
          const batchDir = path.join(uploadsDir, batchId);

          // Create directories if they do not exist
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          fs.mkdirSync(batchDir, { recursive: true });

          // Save metadata.json
          fs.writeFileSync(path.join(batchDir, "metadata.json"), metadataStr);

          // Save the template file
          const arrayBuffer = await templateFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          fs.writeFileSync(path.join(batchDir, "template.png"), buffer);

          return new Response(
            JSON.stringify({ success: true, batchId }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          console.error("Upload handler error:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Internal Server Error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
