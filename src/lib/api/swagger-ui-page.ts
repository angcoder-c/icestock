/** Página HTML con Swagger UI apuntando al spec en `/openapi.json`. */
export function swaggerUiPageHtml(specUrl = '/openapi.json') {
  const spec = JSON.stringify(specUrl)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IceStock API — Swagger</title>
  <link rel="icon" type="image/png" href="/logo.png" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.21.0/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #0f1419; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.21.0/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.21.0/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: ${spec},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        validatorUrl: null,
      })
    }
  </script>
</body>
</html>`
}
