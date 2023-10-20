const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const commentCode = require("./comment-code");
const retrieveConfluencePages = require("./retrieve-pages");

async function codify(context) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const selection = editor.document.getText(editor.selection);
    if (!selection.trim()) {
      vscode.window.showInformationMessage("No text selected");
      return;
    }
  } else {
    vscode.window.showInformationMessage("You must open a file to codify");
    return;
  }
  // Open a new document or retrieve pages
  const options = [
    "Create new page",
    "Retrieve existing page",
    "Use existing page",
  ];
  const selectedOption = await vscode.window.showQuickPick(options, {
    placeholder:
      "Would you like to retrieve an existing page or create a new one?",
  });

  if (!selectedOption) {
    return;
  }

  if (selectedOption === "Create new page") {
    await createNewPage();
  } else if (selectedOption === "Use existing page") {
    await useExistingPage();
  } else {
    await reusePage(context);
  }
  return;
}

async function useExistingPage() {
  // List existing files that end with .md
  const files = fs.readdirSync(vscode.workspace.workspaceFolders[0].uri.fsPath);
  const markdownFiles = files.filter((file) => file.endsWith(".md"));
  // Show a quick pick menu with the list of files
  const selectedFile = await vscode.window.showQuickPick(markdownFiles, {
    placeHolder: "Select a file",
  });
  if (!selectedFile) {
    return;
  }
  // Open the file
  const filePath = path.join(
    vscode.workspace.workspaceFolders[0].uri.fsPath,
    selectedFile
  );
  await pasteTheCode(filePath);
}

async function reusePage(context) {
  const selectedOption = await retrieveConfluencePages(context);
  if (!selectedOption) {
    return;
  }
  const selectedPage = selectedOption.pageTitle;
  const selectedCloudId = selectedOption.cloudId;
  // // Save the page title and cloud ID to the global state
  const filePath = path.join(
    vscode.workspace.workspaceFolders[0].uri.fsPath,
    selectedPage + ".md"
  );
  await pasteTheCode(filePath);
}

async function createNewPage() {
  const editorName = await vscode.window.showInputBox({
    prompt: "Enter the title for the document",
    placeHolder: "Enter the title for the document",
  });

  if (!editorName) {
    return;
  }

  // Create a new page with the title on the right side of the screen
  const filePath = path.join(
    vscode.workspace.workspaceFolders[0].uri.fsPath,
    editorName + ".md"
  );

  await pasteTheCode(filePath);
}

async function pasteTheCode(filePath) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const selection = editor.document.getText(editor.selection);
    const commentedCode = await commentCode(selection);
    const snippet = `
<pre><code>
${selection}
</code></pre>
<p>${commentedCode}</p>
`;

    // check if the file exists and if it doesn't, create it
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, snippet);
      vscode.workspace.openTextDocument(filePath).then((document) => {
        const edit = new vscode.WorkspaceEdit();

        vscode.workspace.applyEdit(edit).then(() => {
          vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
        });
      });
    } else {
      // Paste the snippet into the editor
      vscode.workspace.openTextDocument(filePath).then((doc) => {
        const edit = new vscode.WorkspaceEdit();
        // insert the snippet at the end of the file
        edit.insert(doc.uri, new vscode.Position(doc.lineCount, 0), snippet);
        vscode.workspace.applyEdit(edit).then(() => {
          vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        });
      });
    }
  }
}

module.exports = codify;
