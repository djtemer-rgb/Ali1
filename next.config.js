/**
 * Minimal turbopack root config to avoid monorepo root detection issues when
 * the Next.js app lives under subdirectories.
 */
module.exports = {
  turbopack: {
    root: __dirname
  }
}
