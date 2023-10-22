const express = require( "express" );
const axios = require( "axios" );
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
const port = 8000;

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "public"));

const atlassianClientId = process.env.ATLASSIAN_CLIENT_ID;
const atlassianClientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
const atlassianRedirectUri = "https://dione-vsc.vercel.app/callback/";

app.get("/", (req, res) => {
    res.render("index", {accessToken: "Please login again"}); // index refers to index.ejs
});

app.get('/callback', async (req, res) => {
const { code } = req.query;

if (!code) {
    return res.status(400).send('Missing authorization code');
}

try {
    const tokenResponse = await axios.post('https://auth.atlassian.com/oauth/token', {
            client_id: atlassianClientId,
            client_secret: atlassianClientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: atlassianRedirectUri,
    });

    const accessToken = tokenResponse.data.access_token;

    res.render("index", {accessToken: accessToken});

    // res.send(`Login successful. </b> Your access token: </b>${accessToken}`);
} catch (error) {
    res.status(500).send('Error logging in: ' + error);
}

});

app.post('/convert', async (req, res) => {
    const mermaidContent = req.body.mermaid;
    
    if (!mermaidContent) {
        return res.status(400).send('Mermaid snippet of code is required.');
    }

    const htmlContent = ```
<html>
  <body>
    Here is one mermaid diagram:
    <pre class="mermaid">
            ${mermaidContent}
    </pre>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true });
    </script>
  </body>
</html>
    ```;

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const screenshot = await page.screenshot();
        await browser.close();

        res.set('Content-Type', 'image/png');
        res.send(screenshot);
    } catch (error) {
        console.error('Error converting HTML to PNG:', error);
        res.status(500).send('Failed to convert HTML to PNG.');
    }
});

app.listen(port, () => {
  console.log(`Listening for OAuth callback on port ${port}`);
});
