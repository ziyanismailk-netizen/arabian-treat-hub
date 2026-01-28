/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',       // <--- REQUIRED for the App
  images: {
    unoptimized: true,    // <--- REQUIRED for images to work
  },
};

export default nextConfig; // <--- This line is different in .mjs