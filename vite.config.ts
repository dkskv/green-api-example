import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules\/(react|react-dom|scheduler)\//,
              priority: 30,
            },
            { name: "validation", test: /node_modules\/zod\//, priority: 20 },
            {
              name: "ui-base",
              test: /node_modules\/(@rc-component|rc-[^/]+|@ant-design|dayjs)\//,
              priority: 15,
            },
            { name: "antd", test: /node_modules\/antd\//, priority: 10 },
            { name: "vendor", test: /node_modules/, priority: 0 },
          ],
        },
      },
    },
  },
});
