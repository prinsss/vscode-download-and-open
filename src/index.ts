import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { defineExtension, useCommand } from 'reactive-vscode'
import sanitize from 'sanitize-filename'
import { window, workspace } from 'vscode'

import * as Meta from './generated/meta'

// the comments are prompts for GitHub Copilot

const { activate, deactivate } = defineExtension(() => {
  useCommand('vscode-download-and-open.download', async () => {
    // show input box to get URL
    const url = await window.showInputBox({ prompt: 'Enter URL to download' })

    if (!url) {
      return
    }

    // get OS temp directory
    const tmpDir = join(tmpdir(), Meta.name)

    // ensure directory exists
    await mkdir(tmpDir, { recursive: true })

    // extract filename from URL
    let filename = url.split('/').pop() ?? String(Date.now())

    // download file with fetch
    const res = await fetch(url)

    // try to read filename from content-disposition header
    const contentDisposition = res.headers.get('content-disposition')
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/)
      if (match) {
        filename = decodeURIComponent(match[1])
      }
    }

    // remove invalid characters from filename
    filename = sanitize(filename, { replacement: '_' })

    // write file to disk
    const filePath = join(tmpDir, filename)
    const fileStream = createWriteStream(filePath)
    await finished(Readable.fromWeb(res.body!).pipe(fileStream))

    // open file in editor immediately
    await openFileInEditor(filePath)

    // and a button to open it later
    const selected = await window.showInformationMessage(
      `Downloaded to ${filePath}`,
      'Open',
    )

    if (selected === 'Open') {
      await openFileInEditor(filePath)
    }
  })
})

async function openFileInEditor(filePath: string) {
  const doc = await workspace.openTextDocument(filePath)
  await window.showTextDocument(doc, {
    preview: false,
  })
}

export { activate, deactivate }
