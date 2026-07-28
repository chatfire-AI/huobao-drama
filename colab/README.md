# Huobao Remote LTXV Bridge

This directory contains the Colab/Kaggle-side service used by the
`colab-ltxv` provider in Huobao.

## Build the notebook

```bash
node colab/build_bridge_notebook.mjs
node colab/build_kaggle_bridge_notebook.mjs
```

This creates `colab/Huobao_LTXV_Colab_Bridge.ipynb`.

The Kaggle builder creates `colab/Huobao_LTXV_Kaggle_Bridge.ipynb`.

## Kaggle workflow

1. Create a Kaggle Notebook and import the generated Kaggle `.ipynb`.
2. In **Settings**, enable **Internet** and select **GPU P100**.
3. Run the three cells in order.
4. Copy the printed Base URL and API Key into the Huobao video configuration:
   - Service type: `video`
   - Provider: `colab-ltxv`
   - Model: `ltxv-0.9.7-13b-distilled-q6_k`
5. Keep the Kaggle session running while Huobao submits and downloads jobs.

The provider id remains `colab-ltxv` for compatibility; the bridge itself now
detects Kaggle or Colab automatically.

## Colab workflow

1. Open the generated notebook in Colab with a T4 runtime.
2. Run **1. Prepare LTXV 0.9.7 Environment**.
3. Run **2. Start Huobao Bridge**.
4. Copy the printed Base URL and API Key into Huobao:
   - Service type: `video`
   - Provider: `colab-ltxv`
   - Model: `ltxv-0.9.7-13b-distilled-q6_k`
5. Use **Test connection** in Huobao. It calls the authenticated `/health`
   endpoint.

The Cloudflare quick-tunnel URL changes whenever the Colab runtime restarts.
Generated files are immediately downloaded by Huobao after completion, so the
temporary Colab runtime is not the system of record.

## API

- `GET /health`
- `POST /v1/video/generations`
- `GET /v1/video/generations/{taskId}`
- `GET /files/{signedFilename}`

The generation and status endpoints require `Authorization: Bearer <API Key>`.
Output files use unguessable signed filenames so Huobao can download them
without forwarding authentication headers.

## T4 safety rules

- Width and height must be divisible by 32.
- Frame count must satisfy `8n+1`.
- Default: `576x1024`, `24 fps`, `121 frames`.
- Built-in LTXV upscale is rejected above 25 frames on T4.
- Jobs run sequentially to avoid GPU out-of-memory failures.
