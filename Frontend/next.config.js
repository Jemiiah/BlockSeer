/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@provablehq/aleo-wallet-adaptor-core',
    '@provablehq/aleo-wallet-adaptor-react',
    '@provablehq/aleo-wallet-adaptor-react-ui',
    '@provablehq/aleo-wallet-adaptor-leo',
    '@provablehq/aleo-wallet-adaptor-puzzle',
    '@provablehq/aleo-wallet-adaptor-prove-alpha',
    '@provablehq/aleo-wallet-standard',
    '@provablehq/aleo-types',
  ],
  webpack: (config) => {
    // Ignore optional dependencies that cause warnings with wagmi/WalletConnect/MetaMask
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    };
    config.externals.push('pino-pretty', 'encoding');

    // Enable WebAssembly and top-level await
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };

    return config;
  },
};

module.exports = nextConfig;
