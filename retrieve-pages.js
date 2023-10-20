const vscode = require("vscode");
const axios = require("axios");
const TurndownService = require('turndown');
const fs = require('fs');
const path = require('path');

const retrieveConfluencePages = async function retrieveConfluencePages(context) {
  try {
    var accessToken = undefined;

    if (!context.globalState.get('ATLASSIAN_ACCESS_TOKEN')) {
        accessToken = await vscode.window.showInputBox({
          placeHolder: "Access Token",
          prompt: "Paste your Access Token",
        });
        context.globalState.update('ATLASSIAN_ACCESS_TOKEN', accessToken);
    } else {
        accessToken = context.globalState.get('ATLASSIAN_ACCESS_TOKEN');
    }

    if (!accessToken) {
      vscode.window.showErrorMessage("Access token not found. Please log in.");
      return;
    }

    var cloudResponse = undefined;

    try {
      cloudResponse = await axios.get(
        "https://api.atlassian.com/oauth/token/accessible-resources",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );
    } catch (error) {
        vscode.window.showErrorMessage("There's a problem with your token. Please login again.");
        context.globalState.update('ATLASSIAN_ACCESS_TOKEN', undefined);
        return;
    }

    // create a dictionary where the page's title is the key and the page's id is the value
    let domains = {};
    cloudResponse.data.forEach((element) => {
      domains[element.name] = element.id;
    });

    context.workspaceState.update('domains_details', domains);

    const options = Object.keys(domains);

    const selectedOption = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select a domain',
    });

    var cloudId = undefined;
    if (selectedOption) {
      cloudId = domains[selectedOption];
    } else {
      return;
    }

    const responseContent = await axios.get(
      `https://api.atlassian.com/ex/confluence/${cloudId}/rest/api/content`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    let pages = {};
    responseContent.data.results.forEach((element) => {
      pages[element.title] = element.id;
    });

    context.workspaceState.update('pages_details', pages);

    const selectedPage = await vscode.window.showQuickPick(Object.keys(pages), {
      placeHolder: 'Select a page',
    });

    var resultsId = undefined;

    if (selectedPage) {
      resultsId = pages[selectedPage];
      vscode.window.showInformationMessage(`Loading page "${selectedPage}"...`);
    } else {
      return;
    }

    const contentRes = await axios.get(
        `https://api.atlassian.com/ex/confluence/${cloudId}/rest/api/content/${resultsId}?expand=body.storage`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

    const HTMLcontent = contentRes.data.body.storage.value;

    const turndownService = new TurndownService();

    // Convert HTML to Markdown
    const markdownContent = turndownService.turndown(HTMLcontent);

    const newFileUri = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, selectedPage + ".md");
            
    fs.writeFileSync(newFileUri, markdownContent);
    vscode.workspace.openTextDocument(newFileUri).then((document) => {
        const edit = new vscode.WorkspaceEdit();

        vscode.workspace.applyEdit(edit).then(() => {
            vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
        });
        
    });

    return {pageTitle: selectedPage, cloudId: cloudId};

  } catch (error) {
    vscode.window.showErrorMessage(
      "Error retrieving Confluence pages: " + error
    );
  }
};

module.exports = retrieveConfluencePages;
