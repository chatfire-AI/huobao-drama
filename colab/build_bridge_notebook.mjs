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
  nbformat_minor: 0,
  metadata: {
    accelerator: 'GPU',
    colab: {
      gpuType: 'T4',
      provenance: [],
    },
    kernelspec: {
      display_name: 'Python 3',
      name: 'python3',
    },
    language_info: {
      name: 'python',
    },
  },
  cells: [
    {
      cell_type: 'markdown',
      metadata: { id: 'huobao-title' },
      source: [
        '# Huobao + Colab LTXV Bridge\n',
        '\n',
        'Run the two cells in order. The second cell prints the Base URL and API Key to enter in Huobao settings.\n',
        '\n',
        '**T4 defaults:** 576×1024, 24 fps, 121 frames, no built-in upscale.\n',
      ],
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {
        cellView: 'form',
        id: 'prepare-ltxv',
      },
      outputs: [],
      source: [
        '# @title 1. Prepare LTXV 0.9.7 Environment\n',
        'import requests\n',
        `ORIGINAL_NOTEBOOK_URL = ${JSON.stringify(originalNotebookUrl)}\n`,
        'notebook_data = requests.get(ORIGINAL_NOTEBOOK_URL, timeout=120).json()\n',
        "prepare_source = ''.join(notebook_data['cells'][2]['source'])\n",
        'result = get_ipython().run_cell(prepare_source)\n',
        'if result.error_before_exec or result.error_in_exec:\n',
        "    raise RuntimeError('LTXV environment setup failed')\n",
      ],
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {
        cellView: 'form',
        id: 'start-bridge',
      },
      outputs: [],
      source: [
        '# @title 2. Start Huobao Bridge\n',
        '%pip install -q fastapi uvicorn\n',
        bridgeSource,
      ],
    },
  ],
}

const outputPath = path.join(root, 'Huobao_LTXV_Colab_Bridge.ipynb')
fs.writeFileSync(outputPath, `${JSON.stringify(notebook, null, 2)}\n`)
console.log(outputPath)
