// Root instrumentation entrypoint for production.
// Medusa automatically loads this file if it exists at the project root.
// Keep this file minimal unless you want to enable OpenTelemetry.

module.exports.register = function () {
  // no-op instrumentation in production by default
}
