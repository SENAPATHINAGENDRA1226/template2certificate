import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";

export const Route = createFileRoute("/api/cert/$batchId/$filename")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { batchId, filename } = params;

          // Prevent directory traversal attacks by securing path segments
          const safeBatchId = path.basename(batchId);
          const safeFilename = path.basename(filename);

          const filePath = path.resolve("./uploads", safeBatchId, safeFilename);

          // Check if file exists
          if (!fs.existsSync(filePath)) {
            return new Response("File not found", { status: 404 });
          }

          // Read file content
          const fileBuffer = fs.readFileSync(filePath);
          
          // Determine MIME type
          const ext = path.extname(safeFilename).toLowerCase();
          let contentType = "application/octet-stream";
          if (ext === ".png") {
            contentType = "image/png";
          } else if (ext === ".jpg" || ext === ".jpeg") {
            contentType = "image/jpeg";
          } else if (ext === ".json") {
            contentType = "application/json";
          }

          return new Response(fileBuffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": `inline; filename="${safeFilename}"`,
              "Cache-Control": "public, max-age=31536000",
            },
          });
        } catch (error) {
          console.error("File serving error:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
