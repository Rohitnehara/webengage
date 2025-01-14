const express = require('express');
const axios = require('axios');
const fs = require('fs');
const fastcsv = require('fast-csv');
const path = require('path');

const app = express();
const port = 3000;

const API_URLS = {
  users: 'https://jsonplaceholder.typicode.com/users',
  posts: 'https://jsonplaceholder.typicode.com/posts',
  comments: 'https://jsonplaceholder.typicode.com/comments',
};

async function fetchDataFromAPIs() {
  try {
    const [usersResponse, postsResponse, commentsResponse] = await Promise.all([
      axios.get(API_URLS.users),
      axios.get(API_URLS.posts),
      axios.get(API_URLS.comments),
    ]);

    return {
      users: usersResponse.data,
      posts: postsResponse.data,
      comments: commentsResponse.data,
    };
  } catch (error) {
    throw new Error('Error fetching data from APIs');
  }
}

async function generateCSV(combinedData) {
  return new Promise((resolve, reject) => {
    try {
      const filePath = path.join(__dirname, 'output', 'data.csv');

 
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const ws = fs.createWriteStream(filePath);
      const csvStream = fastcsv.format({ headers: true });

      ws.on('finish', () => resolve(filePath));
      ws.on('error', error => reject(error));

      csvStream.pipe(ws);

      combinedData.forEach(row => {
        csvStream.write(row);
      });

      csvStream.end();
    } catch (error) {
      reject(error);
    }
  });
}

app.get('/generate-csv', async (req, res) => {
  try {
    
    const { users, posts, comments } = await fetchDataFromAPIs();

   
    const combinedData = users.map(user => {
      const post = posts.find(p => p.userId === user.id);
      const comment = comments.find(c => c.postId === post?.id);
      return {
        name: user.name,
        title: post?.title || '',
        body: comment?.body || '',
      };
    });


    const csvFilePath = await generateCSV(combinedData);

    
    res.download(csvFilePath, 'data.csv', err => {
      if (err) {
        console.error('Error sending the file:', err);
        res.status(500).json({ error: 'Failed to download the file' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
