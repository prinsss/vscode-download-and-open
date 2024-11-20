import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { defineExtension, useCommand } from 'reactive-vscode'
import { window, workspace } from 'vscode'

import * as Meta from './generated/meta'

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

    // get filename from URL
    const filename = url.split('/').pop() ?? String(Date.now())
    const filePath = join(tmpDir, filename)

    // download file with fetch
    await downloadFile(url, filePath)

    // open file in editor immediately
    await openFile(filePath)

    // and a button to open it later
    const selected = await window.showInformationMessage(
      `Downloaded to ${filePath}`,
      'Open',
    )

    if (selected === 'Open') {
      await openFile(filePath)
    }
  })
})

async function downloadFile(url: string, filePath: string) {
  const res = await fetch(url)
  const fileStream = createWriteStream(filePath)
  await finished(Readable.fromWeb(res.body!).pipe(fileStream))
}

async function openFile(filePath: string) {
  const doc = await workspace.openTextDocument(filePath)
  await window.showTextDocument(doc, {
    preview: false,
  })
}

export { activate, deactivate }
