import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const bridgeSource = fs.readFileSync(path.join(root, 'huobao_ltxv_bridge.py'), 'utf8')

const originalNotebookUrl = [
  'https://raw.githubusercontent.com/Isi-dev/Google-Colab_Notebooks/',
  '66b41caaecbc91f63c6ccb583e279852be71dea8/',
  'LTXV_0_9_7_13B_Distilled_Image_to_Video.ipynb',
].join('')

const notebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    accelerator: 'GPU',
    kernelspec: {
      display_name: 'Python 3',
      language: 'python',
      name: 'python3',
    },
    language_info: {
      name: 'python',
      version: '3.11',
    },
  },
  cells: [
    {
      cell_type: 'markdown',
      metadata: {},
      source: [
        '# Huobao + Kaggle LTXV Bridge\n',
        '\n',
        'Before running: open **Settings → Accelerator → GPU P100** and turn **Internet on**.\n',
        '\n',
        'Run the three cells in order. The final cell prints the Base URL and API Key for Huobao.\n',
        '\n',
        '**Defaults:** 576×1024, 24 fps, 121 frames, no built-in upscale. Kaggle sessions last up to 12 hours.\n',
      ],
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        '# 1. Verify Kaggle GPU and storage\n',
        'from pathlib import Path\n',
        'import shutil\n',
        'import subprocess\n',
        '\n',
        "assert Path('/kaggle/working').exists(), 'Run this notebook on Kaggle.'\n",
        "gpu_names = subprocess.check_output(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'], text=True).strip().splitlines()\n",
        "assert gpu_names, 'Enable a GPU in Settings before continuing.'\n",
        "print('GPUs:', gpu_names)\n",
        "print('Free /kaggle/working GiB:', round(shutil.disk_usage('/kaggle/working').free / 2**30, 2))\n",
      ],
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        '# 2. Prepare LTXV 0.9.7 environment (first run downloads the model)\n',
        'import requests\n',
        `ORIGINAL_NOTEBOOK_URL = ${JSON.stringify(originalNotebookUrl)}\n`,
        "response = requests.get(ORIGINAL_NOTEBOOK_URL, timeout=120)\n",
        'response.raise_for_status()\n',
        'notebook_data = response.json()\n',
        "prepare_source = ''.join(notebook_data['cells'][2]['source'])\n",
        '\n',
        "# Make the Colab source Kaggle-compatible.\n",
        "# Remove Colab-only imports as complete lines. Removing only the import text\n",
        "# would leave its leading spaces joined to the following line.\n",
        "prepare_source = prepare_source.replace('    from google.colab import files\\n', '')\n",
        "prepare_source = prepare_source.replace('from google.colab import files\\n', '')\n",
        "prepare_source = prepare_source.replace('/content', '/kaggle/working')\n",
        "# Upscaling is disabled for our 121-frame workflow; skip this optional ~1 GB model.\n",
        "prepare_source = '\\n'.join(\n",
        "    line for line in prepare_source.splitlines()\n",
        "    if 'ltxv-spatial-upscaler-0.9.7.safetensors' not in line\n",
        ")\n",
        "result = get_ipython().run_cell(prepare_source)\n",
        'if result.error_before_exec or result.error_in_exec:\n',
        "    raise RuntimeError('LTXV environment setup failed')\n",
        "assert 'generate_video' in globals(), 'generate_video was not initialized'\n",
        "print('LTXV environment ready on Kaggle.')\n",
      ],
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        '# 3. Start Huobao HTTP bridge\n',
        '%pip install -q fastapi uvicorn\n',
        bridgeSource,
      ],
    },
  ],
}

const outputPath = path.join(root, 'Huobao_LTXV_Kaggle_Bridge.ipynb')
fs.writeFileSync(outputPath, `${JSON.stringify(notebook, null, 2)}\n`)
console.log(outputPath)
