const express = require( "express" );
const axios = require( "axios" );
require('dotenv').config();

const app = express();
const port = 8000;

app.set("view engine", "ejs");
app.use(express.static('public'));

const atlassianClientId = process.env.ATLASSIAN_CLIENT_ID;
const atlassianClientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
const atlassianRedirectUri = "http://localhost:8000/callback/";

app.get("/", (req, res) => {
    res.render("index", {accessToken: "Please login again"}); // index refers to index.ejs
});

app.get('/callback', async (req, res) => {
const { code } = req.query;

if (!code) {
    return res.status(400).send('Missing authorization code');
}
// console.log('code ' + code);
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

app.listen(port, () => {
  console.log(`Listening for OAuth callback on port ${port}`);
});
