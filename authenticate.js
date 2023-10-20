const vscode = require('vscode');
const generateUID = require('./utils');

function authenticate(context) {

    context.globalState.update('ATLASSIAN_ACCESS_TOKEN', undefined);

    const YOUR_USER_BOUND_VALUE = generateUID();
    const authorizationUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=ORuHfUtA7BUvMeNwMNz1hYQX0s8ZPh8w&scope=write%3Aconfluence-content%20read%3Aconfluence-space.summary%20write%3Aconfluence-space%20write%3Aconfluence-file%20read%3Aconfluence-props%20write%3Aconfluence-props%20manage%3Aconfluence-configuration%20read%3Aconfluence-content.all%20read%3Aconfluence-content.summary%20search%3Aconfluence%20read%3Aconfluence-content.permission%20read%3Aconfluence-user%20read%3Aconfluence-groups%20write%3Aconfluence-groups%20readonly%3Acontent.attachment%3Aconfluence&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fcallback%2F&state=${YOUR_USER_BOUND_VALUE}&response_type=code&prompt=consent`;

    vscode.env.openExternal(vscode.Uri.parse(authorizationUrl)).then((response) => {
        console.log('response ' + response);
    });
}

module.exports = authenticate;