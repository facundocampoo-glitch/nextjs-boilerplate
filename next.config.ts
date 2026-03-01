// next.config.ts

const nextConfig = {
  experimental: {
    externalDir: true,
  },

  // Next 16 + Turbopack: si existe cualquier "webpack:" te grita.
  // Con esto lo dejamos explícito y no rompe el dev server.
  turbopack: {},

  // Nota: "eslint" ya no es opción válida en next.config.ts en Next 16.
};

export default nextConfig;