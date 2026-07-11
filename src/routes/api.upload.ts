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
          const formData = await request.formData();
          const zipFile = formData.get("zip") as File | null;
          const metadataStr = formData.get("metadata") as string | null;

          if (!zipFile || !metadataStr) {
            return new Response(
              JSON.stringify({ error: "Missing zip file or metadata" }),
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

          // Extract files from the zip
          const arrayBuffer = await zipFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const zip = await JSZip.loadAsync(buffer);

          for (const [filename, fileObj] of Object.entries(zip.files)) {
            if (!fileObj.dir) {
              const fileContent = await fileObj.async("nodebuffer");
              // Prevent directory traversal attacks by taking only the file base name
              const safeFilename = path.basename(filename);
              fs.writeFileSync(path.join(batchDir, safeFilename), fileContent);
            }
          }

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
