# Cómo subir el Verificador de afirmaciones

Contenido de la carpeta:
- `index.html`: la página.
- `netlify/functions/verificar.mjs`: el intermediario que guarda tu clave en secreto.
- `package.json` y `netlify.toml`: configuración. No hace falta tocarlos.

## 1. Sacar la clave de la API
1. Entrá a console.anthropic.com, creá una cuenta y cargá una tarjeta y algo de crédito.
2. En **Limits**, poné un **tope de gasto mensual**, por ejemplo 10 USD. Es tu protección principal.
3. En **API Keys**, creá una clave y copiala. Empieza con `sk-ant-…`. No la compartas ni la pegues en la página.

## 2. Subir los archivos a GitHub
1. Creá una cuenta gratuita en github.com.
2. Creá un repositorio nuevo con **New repository**, por ejemplo `verificador`.
3. Tocá **uploading an existing file** y arrastrá **todo el contenido** de esta carpeta, incluida la subcarpeta `netlify`. Después tocá **Commit changes**.

## 3. Publicar en Netlify
1. Entrá a app.netlify.com y registrate con tu cuenta de GitHub.
2. Elegí **Add new project → Import an existing project → GitHub** y seleccioná el repositorio.
3. Dejá los valores que aparecen y tocá **Deploy**.
4. Andá a **Project configuration → Environment variables** y agregá:
   - `ANTHROPIC_API_KEY` = tu clave `sk-ant-…`
5. Andá a **Deploys → Trigger deploy → Deploy project** para que tome la clave.

En un minuto vas a tener una dirección del tipo `https://verificador-xyz.netlify.app`. En **Domain management** podés cambiarle el nombre o conectar un dominio propio.

## 4. Que aparezca en Google
Registrá la dirección en search.google.com/search-console y pedí la indexación. Puede tardar algunos días.

## Ajustes opcionales
Se cambian en las variables de entorno y después hay que volver a publicar con **Trigger deploy**.
- `LIMITE_DIARIO_POR_PERSONA`: consultas por persona por día. Viene en 15.
- `LIMITE_DIARIO_TOTAL`: consultas totales por día en toda la página. Viene en 300.
- `MODELO_CLAUDE`: el modelo que se usa. Viene en `claude-sonnet-5-5`. Si algún día da error de modelo, cambialo por uno vigente de docs.claude.com.

## Si algo falla
- **"Falta configurar la clave"**: falta la variable `ANTHROPIC_API_KEY` o no se volvió a publicar después de agregarla.
- **"El servicio de análisis no respondió"**: revisá que tengas crédito en la consola de Anthropic. El detalle aparece en Netlify, en **Logs → Functions**.
