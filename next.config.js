/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/nipt-result-interpreter-th',
  images: {
    unoptimized: true,
  },
  assetPrefix: '/nipt-result-interpreter-th/',
}

module.exports = nextConfig