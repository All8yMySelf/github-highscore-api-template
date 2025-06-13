const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = process.env.REPO_OWNER;
  const REPO_NAME = process.env.REPO_NAME;
  const FILE_PATH = process.env.TARGET_FILE;
  const BRANCH = process.env.TARGET_BRANCH;

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json'
  };

  const input = JSON.parse(event.body);
  const newEntry = {
    name: input.name,
    score: input.score,
    country: input.country,
    date: new Date().toISOString()
  };

  const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  try {
    // Step 1: Get existing file
    const fileRes = await fetch(getUrl, { headers });
    const fileData = await fileRes.json();

    let currentData = [];
    if (fileData.content) {
      const content = Buffer.from(fileData.content, 'base64').toString();
      currentData = JSON.parse(content);
    }

    // Step 2: Add new score and sort
    currentData.push(newEntry);
    currentData.sort((a, b) => b.score - a.score);
    currentData = currentData.slice(0, 10); // Keep top 10

    // Step 3: Push updated file
    const updatedContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64');

    const putRes = await fetch(getUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Updated highscores from Netlify Function',
        content: updatedContent,
        sha: fileData.sha,
        branch: BRANCH
      })
    });

    if (!putRes.ok) {
      throw new Error(`GitHub update failed: ${putRes.statusText}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, updated: currentData })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Error: ${error.message}`
    };
  }
};

