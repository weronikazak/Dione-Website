const vscode = require("vscode");
const axios = require("axios");
const { API_TOKEN, EMAIL } = require("./globals");
const fetch = require("node-fetch");

const updateOrCreatePage = async function retrieveConfluencePages(context) {
  try {
    var accessToken = undefined;

    if (!context.globalState.get("ATLASSIAN_ACCESS_TOKEN")) {
      accessToken = await vscode.window.showInputBox({
        placeHolder: "Access Token",
        prompt: "Paste your Access Token",
      });
      context.globalState.update("ATLASSIAN_ACCESS_TOKEN", accessToken);
    } else {
      accessToken = context.globalState.get("ATLASSIAN_ACCESS_TOKEN");
    }

    if (!accessToken) {
      vscode.window.showErrorMessage("Access token not found. Please log in.");
      return;
    }

    const pages = vscode.workspace.textDocuments.filter((document) =>
      document.fileName.endsWith(".md")
    );
    // Show a quick pick menu with all the pages
    const selectedPage = await vscode.window.showQuickPick(
      pages.map((page) => page.fileName.split("\\").pop().replace(".md", "")),
      {
        placeHolder: "Select a page to push to Confluence",
      }
    );

    const pagesDetails = context.workspaceState.get("pages_details");
    console.log("pagesDetails " + JSON.stringify(pagesDetails));

    if (!pagesDetails) {
      vscode.window.showErrorMessage(
        "No pages found. Please retrieve pages first."
      );
      return;
    }
    console.log("selectedPage " + selectedPage);
    if (!selectedPage) {
      return;
    }

    // choose domains to push to
    const domains = context.workspaceState.get("domains_details");
    console.log("domains " + JSON.stringify(domains));
    if (!domains) {
      vscode.window.showErrorMessage(
        "No domains found. Please retrieve domains first."
      );
      return;
    }
    // Show a quick pick menu with all the domains
    const selectedDomain = await vscode.window.showQuickPick(
      Object.keys(domains),
      {
        placeHolder: "Select a domain to push to",
      }
    );
    console.log("selectedDomain " + selectedDomain);
    if (!selectedDomain) {
      return;
    }

    // Check if selected page exists in the pagesDetails dictionary
    if (!pagesDetails[selectedPage]) {
      // Create a new page
      await createNewPage(selectedDomain, selectedPage);
    } else {
      // Update a page
      updateExistingPage(selectedDomain, pagesDetails, selectedPage)
      console.log(
        "selectedPage " + selectedPage + " " + pagesDetails[selectedPage]
      );

      // await updateExistingPage(pagesDetails, selectedPage, accessToken);
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      "Error retrieving Confluence pages: " + error
    );
  }
};

async function createNewPage(domain, pageTitle) {
  // get data from the editor of name selectedPage
  const document = vscode.window.activeTextEditor.document.getText();

  // Retrieve spaces
  const responseContent = await axios.get(
    `https://${domain}.atlassian.net/wiki/api/v2/spaces`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${EMAIL}:${API_TOKEN}`).toString(
          "base64"
        )}`,
        Accept: "application/json",
      },
    }
  );

  if (!responseContent.data.results) {
    vscode.window.showErrorMessage(
      "No spaces found. Please create a space first."
    );
    return;
  }

  // create a dict with space name and space id
  const spaces = {};
  responseContent.data.results.forEach((space) => {
    spaces[space.name] = space.id;
  });

  // show a quick pick menu with all the spaces
  const selectedSpace = await vscode.window.showQuickPick(Object.keys(spaces), {
    placeHolder: "Select a space to push to Confluence",
  });

  console.log("selectedSpace " + selectedSpace);

  if (!selectedSpace) {
    return;
  }

  const body = document.replace(/"/g, "'").replace(/\n/g, '<br/>').replace(/\r/g, "");

  const bodyData = `{
    "spaceId": "${spaces[selectedSpace]}",
    "status": "current",
    "title": "${pageTitle}",
    "body": {
      "representation": "storage",
      "value": "<html>${body}</html>"
    }
  }`;

  
  fetch(`https://${domain}.atlassian.net/wiki/api/v2/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${EMAIL}:${API_TOKEN}`
      ).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: bodyData
  })
    .then(response => {
      console.log(
        `Response: ${response.status} ${response.statusText}`
      );
      if (response.status === 200) {
        vscode.window.showInformationMessage(
          "Page created successfully"
        );
      } else {
        vscode.window.showErrorMessage(
          "Error creating page: " + response.statusText
        );
      }
      return response.text();
    })
    .then(text => console.log(text))
    .catch(err => vscode.window.showErrorMessage(err)); 
}

async function updateExistingPage(domain, pagesDetails, pageTitle) {
  // get data from the editor of name selectedPage
  const document = vscode.window.activeTextEditor.document.getText();
  const cloudId = pagesDetails[pageTitle];

  // get last version of the page
  const responseContent = await axios.get(
    `https://${domain}.atlassian.net/wiki/api/v2/pages/${cloudId}/versions`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${EMAIL}:${API_TOKEN}`).toString(
          "base64"
        )}`,
        Accept: "application/json",
      },
    }
  );

  if (!responseContent.data.results) {
    vscode.window.showErrorMessage(
      "No spaces found. Please create a space first."
    );
    return;
  }

  const lastVersion = responseContent.data.results[0].number;
  console.log("lastVersion " + lastVersion);

  if (!lastVersion) {
    vscode.window.showErrorMessage(
      "Error getting page's last version"
    );
    return;
  }

  const body = document.replace(/"/g, "'").replace(/\n/g, '<br/>').replace(/\r/g, "");

  console.log("body " + body);

  const bodyData = `{
    "id": "${cloudId}",
    "status": "current",
    "title": "${pageTitle}",
    "body": {
      "representation": "storage",
      "value": "<html>${body}</html>"
    },
    "version": {
      "number": ${lastVersion+1},
      "message": "Updated via Dione"
    }
  }`;

  fetch(`https://${domain}.atlassian.net/wiki/api/v2/pages/${cloudId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${EMAIL}:${API_TOKEN}`
      ).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: bodyData
  })
    .then(response => {
    console.log(
      `Response: ${response.status} ${response.statusText}`
    );
    if (response.status === 200) {
      vscode.window.showInformationMessage(
        "Page updated successfully"
      );
    } else {
      vscode.window.showErrorMessage(
        "Error updating page: " + response.statusText
      );
    }
    return response.text();
  })
  .then(text => console.log(text))
  .catch(err => vscode.window.showErrorMessage(err)); 
}

module.exports = updateOrCreatePage;
